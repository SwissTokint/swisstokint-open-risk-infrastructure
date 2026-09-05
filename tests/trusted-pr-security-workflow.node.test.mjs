import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseDocument } from 'yaml';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
}

const trustedWorkflow = read('../.github/workflows/trusted-pr-security.yml');
const mergeCandidateWorkflow = read('../.github/workflows/ci.yml');
const trustedWorkflowDocument = parseDocument(trustedWorkflow, {
  prettyErrors: false,
  schema: 'core',
  strict: true,
  uniqueKeys: true,
});
assert.equal(trustedWorkflowDocument.errors.length, 0);
assert.equal(trustedWorkflowDocument.warnings.length, 0);
const trustedWorkflowData = trustedWorkflowDocument.toJS({ maxAliasCount: 0 });
const trustedExactHeadJob = trustedWorkflowData.jobs['trusted-exact-head'];
const trustedTests = read('../.github/trusted-security-tests.txt')
  .trim()
  .split('\n');

const tokenExposurePattern = /(?:(?:github|secrets)\s*(?:\.\s*(?:token|github_token)|\[\s*["'](?:token|github_token)["']\s*\])|tojson\s*\(\s*(?:github|secrets)\s*\))/iu;

function collectTokenExposures(value, path = [], exposures = []) {
  if (typeof value === 'string') {
    if (tokenExposurePattern.test(value)) exposures.push(path.join('.'));
    return exposures;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      collectTokenExposures(entry, [...path, String(index)], exposures);
    }
    return exposures;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      collectTokenExposures(entry, [...path, key], exposures);
    }
  }
  return exposures;
}

test('trusted PR gate is base-owned, narrowly writable and exact-head bound', () => {
  assert.match(trustedWorkflow, /^on:\n  pull_request_target:\n/mu);
  assert.match(trustedWorkflow, /^    types: \[opened, synchronize, reopened, ready_for_review, edited, closed\]$/mu);
  assert.match(trustedWorkflow, /^  push:\n    branches: \[main\]$/mu);
  assert.doesNotMatch(trustedWorkflow, /^  pull_request:\s*$/mu);
  assert.match(
    trustedWorkflow,
    /^permissions:\n  contents: read\n  pull-requests: read\n  statuses: write$/mu,
  );
  assert.equal([...trustedWorkflow.matchAll(/^permissions:$/gmu)].length, 1);
  assert.equal([...trustedWorkflow.matchAll(/^\s*permissions:/gmu)].length, 1);
  assert.doesNotMatch(trustedWorkflow, /permissions:\s*write-all/u);
  assert.doesNotMatch(trustedWorkflow, /\b(?:contents|actions|checks|pull-requests): write\b/u);
  assert.doesNotMatch(trustedWorkflow, /\$\{\{\s*secrets\./u);
  assert.doesNotMatch(trustedWorkflow, /\$\{\{\s*secrets\s*\[/u);
  assert.match(trustedWorkflow, /^  trusted-exact-head:$/mu);
  assert.equal(
    trustedExactHeadJob.env.NODE_IMAGE,
    'node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5',
  );
  assert.match(
    trustedWorkflow,
    /^    if: github\.event_name == 'pull_request_target' && github\.event\.action != 'closed' && github\.event\.pull_request\.base\.ref == 'main'$/mu,
  );
  assert.match(trustedWorkflow, /EXPECTED_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/u);
  assert.match(trustedWorkflow, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/u);
  assert.match(trustedWorkflow, /repository: \$\{\{ github\.event\.pull_request\.head\.repo\.full_name \}\}/u);
  assert.match(trustedWorkflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/u);
  assert.ok(
    [...trustedWorkflow.matchAll(/^\s+persist-credentials: false$/gmu)].length >= 2,
    'both trusted and candidate checkouts must discard credentials',
  );
  assert.match(trustedWorkflow, /test "\$\(git -C candidate rev-parse HEAD\)" = "\$EXPECTED_HEAD_SHA"/u);
  assert.equal(
    [...trustedWorkflow.matchAll(/^\s+GH_TOKEN: \$\{\{ github\.token \}\}$/gmu)].length,
    4,
    'the token must exist only in the reviewed status publisher steps',
  );
  const approvedTokenSteps = new Set([
    'Publish exact-head pending status',
    'Publish exact-head terminal status',
    'Invalidate departing exact-head evidence',
    'Invalidate open PR evidence from the previous main commit',
  ]);
  const approvedTokenStepCounts = new Map();
  const allTokenExposures = collectTokenExposures(trustedWorkflowData);
  assert.equal(allTokenExposures.length, 4, 'every GitHub token exposure must be allowlisted');
  for (const [jobName, job] of Object.entries(trustedWorkflowData.jobs)) {
    for (const step of job.steps) {
      const exposures = collectTokenExposures(step);
      if (approvedTokenSteps.has(step.name)) {
        approvedTokenStepCounts.set(step.name, (approvedTokenStepCounts.get(step.name) ?? 0) + 1);
        assert.equal(step.env?.GH_TOKEN, '${{ github.token }}');
        assert.deepEqual(exposures, ['env.GH_TOKEN']);
      } else {
        assert.deepEqual(exposures, [], `${jobName}/${step.name} must not receive the token`);
      }
    }
  }
  assert.deepEqual(
    Object.fromEntries(approvedTokenStepCounts),
    Object.fromEntries([...approvedTokenSteps].map((name) => [name, 1])),
  );
  assert.doesNotMatch(trustedWorkflow, /--env (?:GH_TOKEN|GITHUB_TOKEN)/u);
  assert.match(trustedWorkflow, /^\s+STATUS_STATE: pending$/mu);
  assert.match(
    trustedWorkflow,
    /^\s+STATUS_STATE: \$\{\{ job\.status == 'success' && 'success' \|\| 'failure' \}\}$/mu,
  );
  assert.equal(
    [...trustedWorkflow.matchAll(/node trusted-base\/scripts\/publish-trusted-pr-status\.mjs/gu)].length,
    3,
  );
  const pendingPublisher = trustedExactHeadJob.steps.find(
    (step) => step.name === 'Publish exact-head pending status',
  );
  const terminalPublisher = trustedExactHeadJob.steps.find(
    (step) => step.name === 'Publish exact-head terminal status',
  );
  assert.equal(pendingPublisher.run, 'node trusted-base/scripts/publish-trusted-pr-status.mjs');
  assert.equal(terminalPublisher.run, 'node trusted-base/scripts/publish-trusted-pr-status.mjs');
  assert.ok(trustedExactHeadJob.steps.some(
    (step) => step.name === 'Reject in-band trusted control-plane changes'
      && step.run === 'node trusted-base/scripts/verify-trusted-control-plane.mjs',
  ));
});

test('a main advance invalidates every open PR exact-head status', () => {
  assert.match(trustedWorkflow, /^  invalidate-stale-exact-head:$/mu);
  assert.match(
    trustedWorkflow,
    /^    if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'$/mu,
  );
  assert.match(trustedWorkflow, /^      EXPECTED_BASE_SHA: \$\{\{ github\.sha \}\}$/mu);
  assert.match(trustedWorkflow, /gh api --method GET "repos\/\$GITHUB_REPOSITORY\/pulls"/u);
  assert.match(trustedWorkflow, /-f state=open/u);
  assert.match(trustedWorkflow, /-f base=main/u);
  assert.match(trustedWorkflow, /--paginate/u);
  assert.doesNotMatch(trustedWorkflow, /\$\{#open_heads\[@\]\}.*-le/u);
  assert.match(trustedWorkflow, /declare -A seen=\(\)/u);
  assert.match(trustedWorkflow, /EXPECTED_HEAD_SHA="\$head_sha"/u);
});

test('departing and closed PR heads cannot replay historical success', () => {
  assert.match(trustedWorkflow, /^  invalidate-departing-exact-head:$/mu);
  assert.match(
    trustedWorkflow,
    /github\.event\.action == 'synchronize' \|\|\s+github\.event\.action == 'closed'/u,
  );
  assert.match(
    trustedWorkflow,
    /github\.event\.action == 'edited' && github\.event\.changes\.base\.ref\.from == 'main'/u,
  );
  assert.match(trustedWorkflow, /github\.event\.before/u);
  assert.match(trustedWorkflow, /github\.event\.pull_request\.head\.sha/u);
  const job = trustedWorkflowData.jobs['invalidate-departing-exact-head'];
  const step = job.steps.find((entry) => entry.name === 'Invalidate departing exact-head evidence');
  assert.equal(step.env.GH_TOKEN, '${{ github.token }}');
  assert.equal(step.run, 'node trusted-base/scripts/invalidate-trusted-pr-head-status.mjs');
});

test('token exposure detection is independent of the environment variable spelling', () => {
  assert.deepEqual(collectTokenExposures({
    env: {
      ATTACKER_TOKEN: '${{ github.token }}',
      BRACKET_TOKEN: "${{ github['token'] }}",
      WHOLE_CONTEXT: '${{ toJSON(github) }}',
      SECRET_DOT: '${{ secrets.GITHUB_TOKEN }}',
      SECRET_BRACKET: "${{ secrets['GITHUB_TOKEN'] }}",
    },
  }), [
    'env.ATTACKER_TOKEN',
    'env.BRACKET_TOKEN',
    'env.WHOLE_CONTEXT',
    'env.SECRET_DOT',
    'env.SECRET_BRACKET',
  ]);
});

test('candidate lifecycle hooks cannot mutate the evaluated source tree', () => {
  assert.match(
    trustedWorkflow,
    /npm ci --ignore-scripts --no-audit --no-fund --registry=https:\/\/registry\.npmjs\.org\//u,
  );
  assert.match(trustedWorkflow, /test ! -e candidate\/\.npmrc/u);
  assert.match(trustedWorkflow, /test ! -L candidate\/\.npmrc/u);
  assert.match(trustedWorkflow, /test ! -L candidate\/npm-shrinkwrap\.json/u);
  assert.match(trustedWorkflow, /test ! -L trusted-base\/npm-shrinkwrap\.json/u);
  assert.match(trustedWorkflow, /cp -a trusted-base\/node_modules\/yaml/u);
  assert.match(trustedWorkflow, /linked or unresolved dependency is forbidden/u);
  assert.match(trustedWorkflow, /resolved\.origin !== 'https:\/\/registry\.npmjs\.org'/u);
  assert.match(trustedWorkflow, /\^sha512-\[A-Za-z0-9\+\/\]\{86\}==\$/u);
  assert.match(trustedWorkflow, /^\s+--network bridge \\$/mu);
  assert.match(
    trustedWorkflow,
    /--mount "type=bind,src=\$GITHUB_WORKSPACE\/candidate,dst=\/workspace"/u,
  );
  assert.match(trustedWorkflow, /test ! -L candidate\/node_modules/u);
  assert.match(trustedWorkflow, /git -C candidate ls-files -z/u);
  assert.match(trustedWorkflow, /tar --directory=candidate --null --no-recursion --files-from=-/u);
  assert.match(
    trustedWorkflow,
    /rm -rf "\$evaluation_root\/node_modules" "\$evaluation_root\/scripts" "\$evaluation_root\/tests"/u,
  );
  assert.match(trustedWorkflow, /cp -a trusted-base\/tests\/\. "\$evaluation_root\/tests\/"/u);
  assert.match(trustedWorkflow, /trusted-base\/scripts\/trusted-test-reporter\.mjs/u);
  assert.match(trustedWorkflow, /trusted-base\/scripts\/trusted-test-loader\.mjs/u);
  assert.match(trustedWorkflow, /trusted-base\/scripts\/trusted-test-loader-register\.mjs/u);
  assert.match(trustedWorkflow, /trusted-base\/scripts\/trusted-assert-preload\.mjs/u);
  assert.match(trustedWorkflow, /trusted-base\/\.github\/trusted-security-tests\.txt/u);
  assert.match(trustedWorkflow, /type=bind,src=\$GITHUB_WORKSPACE\/evaluation,dst=\/workspace,readonly/u);
  assert.match(trustedWorkflow, /Candidate sandbox unexpectedly allowed source mutation\./u);
  assert.match(trustedWorkflow, /trusted-base\/scripts\/trusted-expected-red-reporter\.mjs/u);
  assert.match(trustedWorkflow, /trusted-base\/\.github\/trusted-expected-red-test\.txt/u);
  assert.match(trustedWorkflow, /--test-reporter=\.\/scripts\/trusted-expected-red-reporter\.mjs/u);
  assert.match(trustedWorkflow, /TRUSTED_TEST_PATH=tests\/pom-rx-integrity-baseline\.node\.test\.mjs/u);
});

test('candidate tests run without network, write access or ambient privilege', () => {
  assert.match(
    trustedWorkflow,
    /node:22\.23\.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5/u,
  );
  assert.ok([...trustedWorkflow.matchAll(/^\s+--network none \\$/gmu)].length >= 3);
  assert.ok([...trustedWorkflow.matchAll(/^\s+--read-only \\$/gmu)].length >= 3);
  assert.ok([...trustedWorkflow.matchAll(/^\s+--cap-drop ALL \\$/gmu)].length >= 3);
  assert.ok([...trustedWorkflow.matchAll(/^\s+--security-opt no-new-privileges \\$/gmu)].length >= 3);
  assert.ok([...trustedWorkflow.matchAll(/^\s+--user 65532:65532 \\$/gmu)].length >= 3);
  assert.match(
    trustedWorkflow,
    /--permission/u,
  );
  assert.match(
    trustedWorkflow,
    /--allow-fs-read=\/workspace/u,
  );
  assert.match(
    trustedWorkflow,
    /--allow-fs-read=\/tmp/u,
  );
  assert.match(
    trustedWorkflow,
    /--allow-fs-write=\/tmp/u,
  );
  assert.match(
    trustedWorkflow,
    /--no-addons/u,
  );
  assert.doesNotMatch(trustedWorkflow, /--allow-(?:addons|wasi|worker)/u);
  assert.match(
    trustedWorkflow,
    /--import=\.\/scripts\/trusted-test-loader-register\.mjs/u,
  );
  assert.match(
    trustedWorkflow,
    /--import=\.\/scripts\/trusted-assert-preload\.mjs/u,
  );
  assert.match(
    trustedWorkflow,
    /--test-reporter=\.\/scripts\/trusted-test-reporter\.mjs/u,
  );
  assert.match(
    trustedWorkflow,
    /--experimental-test-isolation=none/u,
  );
  assert.match(
    trustedWorkflow,
    /--env TRUSTED_TEST_MANIFEST=\/workspace\/scripts\/trusted-security-tests\.txt/u,
  );
  assert.match(trustedWorkflow, /while IFS= read -r trusted_test; do/u);
  assert.match(trustedWorkflow, /--env TRUSTED_TEST_PATH="\$trusted_test"/u);
  assert.match(trustedWorkflow, /done < trusted-base\/\.github\/trusted-security-tests\.txt/u);
  assert.equal(
    [...trustedWorkflow.matchAll(/--env PATH=\/usr\/local\/sbin:\/usr\/local\/bin:\/usr\/sbin:\/usr\/bin:\/sbin:\/bin/gu)].length,
    2,
    'both candidate-evaluation lanes must use the fixed image executable path',
  );
});

test('ordinary CI remains a distinct canonical push or merge-candidate lane', () => {
  assert.match(mergeCandidateWorkflow, /^  pull_request:\s*$/mu);
  assert.match(mergeCandidateWorkflow, /EXPECTED_CHECKOUT_SHA: \$\{\{ github\.sha \}\}/u);
  assert.match(mergeCandidateWorkflow, /actual_sha="\$\(git rev-parse HEAD\)"/u);
  assert.match(mergeCandidateWorkflow, /test "\$actual_sha" = "\$EXPECTED_CHECKOUT_SHA"/u);
  assert.doesNotMatch(mergeCandidateWorkflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/u);
});

test('trusted regression manifest is bounded, unique and present', () => {
  assert.ok(trustedTests.length >= 40, 'trusted security suite unexpectedly shrank');
  assert.equal(new Set(trustedTests).size, trustedTests.length, 'trusted test paths must be unique');
  for (const testPath of trustedTests) {
    assert.match(testPath, /^tests\/[A-Za-z0-9._/-]+\.test\.mjs$/u);
    const contents = read(`../${testPath}`);
    assert.ok(contents.length > 0, `trusted test is missing or empty: ${testPath}`);
  }
});
