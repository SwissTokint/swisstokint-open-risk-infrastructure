import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
}

const trustedWorkflow = read('../.github/workflows/trusted-pr-security.yml');
const mergeCandidateWorkflow = read('../.github/workflows/ci.yml');
const trustedTests = read('../.github/trusted-security-tests.txt')
  .trim()
  .split('\n');

test('trusted PR gate is base-owned, narrowly writable and exact-head bound', () => {
  assert.match(trustedWorkflow, /^on:\n  pull_request_target:\n/mu);
  assert.doesNotMatch(trustedWorkflow, /^  pull_request:\s*$/mu);
  assert.match(trustedWorkflow, /^permissions:\n  contents: read\n  statuses: write$/mu);
  assert.equal([...trustedWorkflow.matchAll(/^permissions:$/gmu)].length, 1);
  assert.equal([...trustedWorkflow.matchAll(/^\s*permissions:/gmu)].length, 1);
  assert.doesNotMatch(trustedWorkflow, /permissions:\s*write-all/u);
  assert.doesNotMatch(trustedWorkflow, /\b(?:contents|actions|checks|pull-requests): write\b/u);
  assert.doesNotMatch(trustedWorkflow, /\$\{\{\s*secrets\./u);
  assert.match(trustedWorkflow, /^  trusted-exact-head:$/mu);
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
    2,
    'the token must exist only in the pending and terminal status publisher steps',
  );
  assert.doesNotMatch(trustedWorkflow, /--env (?:GH_TOKEN|GITHUB_TOKEN)/u);
  assert.match(trustedWorkflow, /^\s+STATUS_STATE: pending$/mu);
  assert.match(
    trustedWorkflow,
    /^\s+STATUS_STATE: \$\{\{ job\.status == 'success' && 'success' \|\| 'failure' \}\}$/mu,
  );
  assert.equal(
    [...trustedWorkflow.matchAll(/node trusted-base\/scripts\/publish-trusted-pr-status\.mjs/gu)].length,
    2,
  );
});

test('candidate lifecycle hooks cannot mutate the evaluated source tree', () => {
  assert.match(
    trustedWorkflow,
    /npm ci --ignore-scripts --no-audit --no-fund --registry=https:\/\/registry\.npmjs\.org\//u,
  );
  assert.match(trustedWorkflow, /test ! -e candidate\/\.npmrc/u);
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
  assert.match(trustedWorkflow, /type=bind,src=\$GITHUB_WORKSPACE\/evaluation,dst=\/workspace,readonly/u);
  assert.match(trustedWorkflow, /Candidate sandbox unexpectedly allowed source mutation\./u);
  assert.match(trustedWorkflow, /node scripts\/assert-pom-rx-integrity-baseline-red\.mjs/u);
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
