import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInvalidationRequest,
  invalidateTrustedPrHead,
} from '../scripts/invalidate-trusted-pr-head-status.mjs';

import {
  buildTrustedPrStatusRequest,
  publishTrustedPrStatus,
  TRUSTED_PR_STATUS_CONTEXT,
  validateTrustedBaseRefResponse,
  validateTrustedPrStatusResponse,
} from '../scripts/publish-trusted-pr-status.mjs';

const baseEnvironment = Object.freeze({
  EXPECTED_PR_NUMBER: '175',
  EXPECTED_HEAD_REPOSITORY: 'SwissTokint/swisstokint-open-risk-infrastructure',
  EXPECTED_BASE_SHA: 'b'.repeat(40),
  EXPECTED_HEAD_SHA: 'a'.repeat(40),
  GH_TOKEN: 'test-token-not-forwarded',
  GITHUB_API_URL: 'https://api.github.com',
  GITHUB_REPOSITORY: 'SwissTokint/swisstokint-open-risk-infrastructure',
  GITHUB_RUN_ID: '33924872078',
  GITHUB_SERVER_URL: 'https://github.com',
  STATUS_STATE: 'success',
});

function baseResponse() {
  return {
    signal: null,
    status: 0,
    stdout: JSON.stringify({
      ref: 'refs/heads/main',
      object: { type: 'commit', sha: baseEnvironment.EXPECTED_BASE_SHA },
    }),
  };
}

function pullRequestBody() {
  return {
    url: `https://api.github.com/repos/${baseEnvironment.GITHUB_REPOSITORY}/pulls/175`,
    number: 175,
    state: 'open',
    merged: false,
    merged_at: null,
    // GitHub may assign a merge candidate before the PR has been merged.
    merge_commit_sha: 'c'.repeat(40),
    base: {
      ref: 'main',
      sha: baseEnvironment.EXPECTED_BASE_SHA,
      repo: { full_name: baseEnvironment.GITHUB_REPOSITORY },
    },
    head: {
      sha: baseEnvironment.EXPECTED_HEAD_SHA,
      repo: { full_name: baseEnvironment.EXPECTED_HEAD_REPOSITORY },
    },
  };
}

function pullRequestResponse(body = pullRequestBody()) {
  return { signal: null, status: 0, stdout: JSON.stringify(body) };
}

// Keep the historical main-ref/POST fault injections unchanged. The lifecycle
// tests below observe the full transport sequence without this adapter.
function withCurrentPullRequest(spawn) {
  return (command, args, options) => {
    if (args[2] === 'GET' && args[3] === `repos/${baseEnvironment.GITHUB_REPOSITORY}/pulls/175`) {
      assert.equal(command, '/usr/bin/gh');
      assert.deepEqual(args.slice(4), ['--hostname', 'github.com']);
      assert.equal(options.timeout, 20_000);
      return pullRequestResponse();
    }
    return spawn(command, args, options);
  };
}

function statusResponse(request, payload, id = 401) {
  return {
    signal: null,
    status: 0,
    stdout: JSON.stringify({
      id,
      url: `${request.expectedStatusUrlPrefix}${id}`,
      ...payload,
    }),
  };
}

const unavailableResponses = [
  ['thrown transport error', () => { throw new Error('transport unavailable'); }],
  ['timeout result', () => ({ error: new Error('request timed out') })],
  ['terminated process', () => ({ signal: 'SIGTERM', status: null, stdout: '' })],
  ['nonzero exit', () => ({ signal: null, status: 1, stdout: '' })],
  ['lost response', () => ({ signal: null, status: 0, stdout: '' })],
  ['invalid response body', () => ({ signal: null, status: 0, stdout: '[]' })],
  ['unconfirmed status binding', () => ({
    signal: null,
    status: 0,
    stdout: JSON.stringify({ id: 1, url: 'https://api.github.com/unconfirmed' }),
  })],
];

test('terminal status publication checks the full PR binding on both sides of POST', async (t) => {
  for (const state of ['success', 'failure']) {
    await t.test(state, () => {
      const environment = { ...baseEnvironment, STATUS_STATE: state };
      const request = buildTrustedPrStatusRequest(environment);
      const calls = [];
      const spawn = (command, args, options) => {
        calls.push({ command, args, options });
        if (args[3] === request.baseRefPath) return baseResponse();
        if (args[3] === request.pullRequest.apiPath) return pullRequestResponse();
        return statusResponse(request, JSON.parse(options.input));
      };
      assert.deepEqual(publishTrustedPrStatus(environment, spawn), { id: 401, state });
      assert.deepEqual(calls.map(({ args }) => [args[2], args[3]]), [
        ['GET', request.baseRefPath],
        ['GET', request.pullRequest.apiPath],
        ['POST', request.apiPath],
        ['GET', request.baseRefPath],
        ['GET', request.pullRequest.apiPath],
      ]);
      for (const { command, args, options } of calls) {
        assert.equal(command, '/usr/bin/gh');
        assert.deepEqual(args.slice(-2), ['--hostname', 'github.com']);
        assert.equal(options.timeout, 20_000);
        assert.equal(JSON.stringify(options).includes(environment.GH_TOKEN), false);
      }
      assert.equal(Object.isFrozen(request.pullRequest), true);
    });
  }
});

const changedPullRequests = [
  ['updated head', (body) => { body.head.sha = 'd'.repeat(40); }],
  ['closed PR', (body) => { body.state = 'closed'; }],
  ['merged PR', (body) => { body.merged = true; }],
  ['merge timestamp', (body) => { body.merged_at = '2026-09-10T07:00:00Z'; }],
  ['retargeted base', (body) => { body.base.ref = 'release'; }],
  ['advanced base', (body) => { body.base.sha = 'd'.repeat(40); }],
  ['different number', (body) => { body.number = 176; }],
  ['different URL', (body) => { body.url += '/other'; }],
  ['different base repository', (body) => { body.base.repo.full_name = 'Example/base'; }],
  ['different head repository', (body) => { body.head.repo.full_name = 'Example/source'; }],
  ['deleted head repository', (body) => { body.head.repo = null; }],
  ['missing state', (body) => { delete body.state; }],
];

test('PR identity changes prevent publication or invalidate an attempted terminal result', async (t) => {
  for (const [label, change] of changedPullRequests) {
    for (const phase of ['before', 'after']) {
      await t.test(`${label} ${phase}`, () => {
        const request = buildTrustedPrStatusRequest(baseEnvironment);
        let prReads = 0;
        const posts = [];
        const spawn = (_command, args, options) => {
          if (args[3] === request.baseRefPath) return baseResponse();
          if (args[3] === request.pullRequest.apiPath) {
            prReads += 1;
            const body = pullRequestBody();
            if (phase === 'before' || prReads === 2) change(body);
            return pullRequestResponse(body);
          }
          const payload = JSON.parse(options.input);
          posts.push({ path: args[3], payload });
          return statusResponse(request, payload);
        };
        assert.throws(() => publishTrustedPrStatus(baseEnvironment, spawn), /no longer open/u);
        assert.deepEqual(posts.map(({ payload }) => payload.state), phase === 'before' ? [] : ['success', 'pending']);
        for (const { path, payload } of posts) {
          assert.equal(path, request.apiPath);
          assert.equal(payload.target_url, request.payload.target_url);
          assert.equal(payload.context, request.payload.context);
        }
      });
    }
  }
});

test('unavailable PR observations fail closed before and after a terminal write', async (t) => {
  for (const [label, unavailable] of unavailableResponses) {
    for (const phase of ['before', 'after']) {
      await t.test(`${label} ${phase}`, () => {
        const request = buildTrustedPrStatusRequest(baseEnvironment);
        let prReads = 0;
        const states = [];
        const spawn = (_command, args, options) => {
          if (args[3] === request.baseRefPath) return baseResponse();
          if (args[3] === request.pullRequest.apiPath) {
            prReads += 1;
            return phase === 'before' || prReads === 2 ? unavailable() : pullRequestResponse();
          }
          const payload = JSON.parse(options.input);
          states.push(payload.state);
          return statusResponse(request, payload);
        };
        assert.throws(() => publishTrustedPrStatus(baseEnvironment, spawn), Error);
        assert.deepEqual(states, phase === 'before' ? [] : ['success', 'pending']);
      });
    }
  }
});

test('post-publication PR check and recovery retain the captured identity', () => {
  const environment = { ...baseEnvironment };
  const request = buildTrustedPrStatusRequest(environment);
  const originalPr = pullRequestBody();
  const prPaths = [];
  const posts = [];
  const spawn = (_command, args, options) => {
    if (args[3] === request.baseRefPath) return baseResponse();
    if (args[2] === 'GET') {
      prPaths.push(args[3]);
      return pullRequestResponse(prPaths.length === 1 ? originalPr : { ...originalPr, state: 'closed' });
    }
    const payload = JSON.parse(options.input);
    posts.push({ path: args[3], payload });
    environment.EXPECTED_PR_NUMBER = '176';
    environment.EXPECTED_HEAD_REPOSITORY = 'Example/changed';
    environment.EXPECTED_HEAD_SHA = 'e'.repeat(40);
    environment.GITHUB_RUN_ID = '999';
    return statusResponse(request, payload);
  };
  assert.throws(() => publishTrustedPrStatus(environment, spawn), /no longer open/u);
  assert.deepEqual(prPaths, [request.pullRequest.apiPath, request.pullRequest.apiPath]);
  assert.deepEqual(posts.map(({ payload }) => payload.state), ['success', 'pending']);
  assert.ok(posts.every(({ path, payload }) => path === request.apiPath && payload.target_url === request.payload.target_url));
});

test('pending invalidation never requires a live PR or available source repository', () => {
  const environment = { ...baseEnvironment, STATUS_STATE: 'pending' };
  delete environment.EXPECTED_PR_NUMBER;
  delete environment.EXPECTED_HEAD_REPOSITORY;
  const request = buildTrustedPrStatusRequest(environment);
  const methods = [];
  const spawn = (_command, args, options) => {
    assert.notEqual(args[3].includes('/pulls/'), true, 'revocation must not query PR metadata');
    methods.push(args[2]);
    if (args[2] === 'GET') return baseResponse();
    assert.deepEqual(JSON.parse(options.input), request.payload);
    return statusResponse(request, request.payload);
  };
  assert.equal(request.pullRequest, null);
  assert.deepEqual(publishTrustedPrStatus(environment, spawn), { id: 401, state: 'pending' });
  assert.deepEqual(methods, ['GET', 'POST', 'GET']);
  assert.throws(() => buildTrustedPrStatusRequest({ ...environment, STATUS_STATE: 'success' }), /missing EXPECTED_PR_NUMBER/u);
  assert.throws(() => buildTrustedPrStatusRequest({ ...environment, STATUS_STATE: 'failure' }), /missing EXPECTED_PR_NUMBER/u);
});

test('terminal PR identity configuration must be canonical and bounded', async (t) => {
  for (const number of ['', '0', '01', '-1', '1.5', '1e3', '9007199254740992']) {
    await t.test(`number ${JSON.stringify(number)}`, () => {
      assert.throws(() => buildTrustedPrStatusRequest({ ...baseEnvironment, EXPECTED_PR_NUMBER: number }), /EXPECTED_PR_NUMBER/u);
    });
  }
  assert.throws(() => buildTrustedPrStatusRequest({ ...baseEnvironment, EXPECTED_HEAD_REPOSITORY: '' }), /EXPECTED_HEAD_REPOSITORY/u);
  assert.throws(() => buildTrustedPrStatusRequest({ ...baseEnvironment, EXPECTED_HEAD_REPOSITORY: 'https://example.test/source' }), /EXPECTED_HEAD_REPOSITORY/u);
});

test('a matching fork PR is accepted without assuming the head repository equals the base', () => {
  const environment = { ...baseEnvironment, EXPECTED_HEAD_REPOSITORY: 'Example/fork' };
  const request = buildTrustedPrStatusRequest(environment);
  const body = pullRequestBody();
  body.head.repo.full_name = environment.EXPECTED_HEAD_REPOSITORY;
  const spawn = (_command, args, options) => {
    if (args[3] === request.baseRefPath) return baseResponse();
    if (args[3] === request.pullRequest.apiPath) return pullRequestResponse(body);
    return statusResponse(request, JSON.parse(options.input));
  };
  assert.deepEqual(publishTrustedPrStatus(environment, spawn), { id: 401, state: 'success' });
});

test('failure statuses also recover to pending if the PR closes during publication', () => {
  const environment = { ...baseEnvironment, STATUS_STATE: 'failure' };
  const request = buildTrustedPrStatusRequest(environment);
  const states = [];
  const spawn = (_command, args, options) => {
    if (args[3] === request.baseRefPath) return baseResponse();
    if (args[3] === request.pullRequest.apiPath) {
      const body = pullRequestBody();
      if (states.length > 0) body.state = 'closed';
      return pullRequestResponse(body);
    }
    const payload = JSON.parse(options.input);
    states.push(payload.state);
    return statusResponse(request, payload);
  };
  assert.throws(() => publishTrustedPrStatus(environment, spawn), /no longer open/u);
  assert.deepEqual(states, ['failure', 'pending']);
});

test('failed recovery after an uncertain PR lookup preserves both errors', () => {
  const request = buildTrustedPrStatusRequest(baseEnvironment);
  const lookupError = new Error('PR response unavailable');
  const recoveryError = new Error('pending response unavailable');
  let writes = 0;
  const spawn = (_command, args, options) => {
    if (args[3] === request.baseRefPath) return baseResponse();
    if (args[3] === request.pullRequest.apiPath) {
      if (writes > 0) throw lookupError;
      return pullRequestResponse();
    }
    writes += 1;
    if (writes === 2) throw recoveryError;
    return statusResponse(request, JSON.parse(options.input));
  };
  assert.throws(() => publishTrustedPrStatus(baseEnvironment, spawn), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [lookupError, recoveryError]);
    return true;
  });
  assert.equal(writes, 2);
});

test('unconfirmed status writes request pending recovery before reporting failure', async (t) => {
  for (const [label, unavailable] of unavailableResponses) {
    await t.test(label, () => {
      const request = buildTrustedPrStatusRequest(baseEnvironment);
      const calls = [];
      const fakeSpawn = (command, args, options) => {
        calls.push({ command, args, options });
        if (args[2] === 'GET') return baseResponse();
        const payload = JSON.parse(options.input);
        if (payload.state === 'success') return unavailable();
        return statusResponse(request, payload);
      };
      assert.throws(() => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)), Error);
      assert.equal(calls.length, 3);
      assert.equal(calls[0].args[2], 'GET');
      assert.deepEqual(calls.slice(1).map((call) => call.args), [
        ['api', '--method', 'POST', request.apiPath, '--input', '-', '--hostname', 'github.com'],
        ['api', '--method', 'POST', request.apiPath, '--input', '-', '--hostname', 'github.com'],
      ]);
      assert.deepEqual(
        calls.slice(1).map((call) => JSON.parse(call.options.input).state),
        ['success', 'pending'],
      );
      assert.ok(calls.every((call) => call.command === '/usr/bin/gh'));
    });
  }
});

test('pending recovery preserves the original captured head and run', () => {
  const environment = { ...baseEnvironment };
  const request = buildTrustedPrStatusRequest(environment);
  const posts = [];
  const fakeSpawn = (_command, args, options) => {
    if (args[2] === 'GET') return baseResponse();
    const payload = JSON.parse(options.input);
    posts.push({ path: args[3], payload });
    if (posts.length === 1) {
      environment.EXPECTED_HEAD_SHA = 'e'.repeat(40);
      environment.GITHUB_RUN_ID = '999';
      throw new Error('response unavailable after configuration changed');
    }
    return statusResponse(request, payload);
  };
  assert.throws(
    () => publishTrustedPrStatus(environment, withCurrentPullRequest(fakeSpawn)),
    /response unavailable after configuration changed/u,
  );
  assert.equal(posts.length, 2);
  assert.equal(posts[1].path, request.apiPath);
  assert.equal(posts[1].payload.target_url, request.payload.target_url);
  assert.equal(posts[1].payload.context, request.payload.context);
  assert.equal(posts[1].payload.state, 'pending');
});

test('recovery failures preserve both errors and never report a confirmed status', async (t) => {
  for (const [label, unavailable] of unavailableResponses) {
    await t.test(label, () => {
      const publicationError = new Error('publication response lost');
      let postCount = 0;
      const fakeSpawn = (_command, args) => {
        if (args[2] === 'GET') return baseResponse();
        postCount += 1;
        if (postCount === 1) throw publicationError;
        return unavailable();
      };
      assert.throws(() => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)), (error) => {
        assert.ok(error instanceof AggregateError);
        assert.equal(error.errors.length, 2);
        assert.equal(error.errors[0], publicationError);
        assert.ok(error.errors[1] instanceof Error);
        assert.match(error.message, /could not be invalidated/u);
        return true;
      });
      assert.equal(postCount, 2);
    });
  }
});

test('a thrown post-publication lookup still triggers pending recovery', () => {
  const request = buildTrustedPrStatusRequest(baseEnvironment);
  let getCount = 0;
  const states = [];
  const fakeSpawn = (_command, args, options) => {
    if (args[2] === 'GET') {
      getCount += 1;
      if (getCount === 2) throw new Error('freshness response unavailable');
      return baseResponse();
    }
    const payload = JSON.parse(options.input);
    states.push(payload.state);
    return statusResponse(request, payload);
  };
  assert.throws(() => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)), /freshness response unavailable/u);
  assert.deepEqual(states, ['success', 'pending']);
});

test('failure before any publication performs no status write', () => {
  const methods = [];
  const fakeSpawn = (_command, args) => {
    methods.push(args[2]);
    return { error: new Error('initial freshness unavailable') };
  };
  assert.throws(() => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)), /initial freshness unavailable/u);
  assert.deepEqual(methods, ['GET']);
});

test('departing-head invalidation retries unconfirmed attempts and stops at acknowledgement', async (t) => {
  for (const [label, unavailable] of unavailableResponses) {
    await t.test(label, () => {
      const environment = { ...baseEnvironment, INVALIDATED_HEAD_SHA: 'd'.repeat(40) };
      const request = buildInvalidationRequest(environment);
      const calls = [];
      const fakeSpawn = (command, args, options) => {
        calls.push({ command, args, options });
        if (calls.length < 3) return unavailable();
        return statusResponse(request, JSON.parse(options.input));
      };
      assert.deepEqual(invalidateTrustedPrHead(environment, fakeSpawn), { id: 401, state: 'pending' });
      assert.equal(calls.length, 3);
      for (const call of calls) {
        assert.equal(call.command, '/usr/bin/gh');
        assert.deepEqual(call.args, ['api', '--method', 'POST', request.apiPath, '--input', '-', '--hostname', 'github.com']);
        assert.deepEqual(JSON.parse(call.options.input), request.payload);
        assert.equal(call.options.timeout, 20_000);
      }
    });
  }
});

test('departing-head invalidation exhausts a fixed three-attempt budget', () => {
  const environment = { ...baseEnvironment, INVALIDATED_HEAD_SHA: 'd'.repeat(40) };
  let attempts = 0;
  const fakeSpawn = () => {
    attempts += 1;
    return { error: new Error(`unavailable attempt ${attempts}`) };
  };
  assert.throws(() => invalidateTrustedPrHead(environment, fakeSpawn), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, 3);
    assert.deepEqual(error.errors.map((cause) => cause.message), [
      'unavailable attempt 1', 'unavailable attempt 2', 'unavailable attempt 3',
    ]);
    return true;
  });
  assert.equal(attempts, 3);
});

test('trusted status request binds the exact head, run and fixed context', () => {
  const request = buildTrustedPrStatusRequest(baseEnvironment);
  assert.equal(
    request.apiPath,
    `repos/${baseEnvironment.GITHUB_REPOSITORY}/statuses/${baseEnvironment.EXPECTED_HEAD_SHA}`,
  );
  assert.equal(
    request.baseRefPath,
    `repos/${baseEnvironment.GITHUB_REPOSITORY}/git/ref/heads/main`,
  );
  assert.deepEqual(request.payload, {
    state: 'success',
    target_url: `https://github.com/${baseEnvironment.GITHUB_REPOSITORY}/actions/runs/${baseEnvironment.GITHUB_RUN_ID}`,
    description: 'Trusted exact-head security gate succeeded.',
    context: TRUSTED_PR_STATUS_CONTEXT,
  });
  assert.equal(JSON.stringify(request).includes(baseEnvironment.GH_TOKEN), false);
});

test('departing-head invalidation is fixed to pending on the supplied SHA', () => {
  const environment = {
    ...baseEnvironment,
    INVALIDATED_HEAD_SHA: 'd'.repeat(40),
  };
  const request = buildInvalidationRequest(environment);
  assert.equal(request.apiPath, `repos/${environment.GITHUB_REPOSITORY}/statuses/${environment.INVALIDATED_HEAD_SHA}`);
  assert.equal(request.payload.state, 'pending');
  assert.equal(request.payload.context, TRUSTED_PR_STATUS_CONTEXT);

  const fakeSpawn = (_command, _args, options) => {
    const payload = JSON.parse(options.input);
    return {
      error: undefined,
      signal: null,
      status: 0,
      stdout: JSON.stringify({
        id: 77,
        url: `${request.expectedStatusUrlPrefix}77`,
        ...payload,
      }),
    };
  };
  assert.deepEqual(invalidateTrustedPrHead(environment, fakeSpawn), { id: 77, state: 'pending' });
  assert.throws(
    () => buildInvalidationRequest({ ...environment, INVALIDATED_HEAD_SHA: 'unsafe' }),
    /invalid INVALIDATED_HEAD_SHA/u,
  );
});

test('publisher sends only the fixed status payload through the trusted gh path', () => {
  const invocations = [];
  const request = buildTrustedPrStatusRequest(baseEnvironment);
  const response = {
    id: 42,
    url: `${request.expectedStatusUrlPrefix}42`,
    context: request.payload.context,
    state: request.payload.state,
    target_url: request.payload.target_url,
    description: request.payload.description,
  };
  const fakeSpawn = (command, args, options) => {
    invocations.push({ command, args, options });
    if (args[2] === 'GET') {
      return {
        error: undefined,
        signal: null,
        status: 0,
        stdout: JSON.stringify({
          ref: 'refs/heads/main',
          object: { type: 'commit', sha: baseEnvironment.EXPECTED_BASE_SHA },
        }),
      };
    }
    return { error: undefined, signal: null, status: 0, stdout: JSON.stringify(response) };
  };

  assert.deepEqual(publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)), { id: 42, state: 'success' });
  assert.equal(invocations.length, 3);
  assert.equal(invocations[0].command, '/usr/bin/gh');
  assert.deepEqual(invocations[0].args, ['api', '--method', 'GET', request.baseRefPath, '--hostname', 'github.com']);
  assert.equal(invocations[1].command, '/usr/bin/gh');
  assert.deepEqual(invocations[1].args, ['api', '--method', 'POST', request.apiPath, '--input', '-', '--hostname', 'github.com']);
  assert.deepEqual(JSON.parse(invocations[1].options.input), request.payload);
  assert.equal(invocations[1].options.input.includes(baseEnvironment.GH_TOKEN), false);
  assert.deepEqual(invocations[2].args, ['api', '--method', 'GET', request.baseRefPath, '--hostname', 'github.com']);
});

test('publisher overwrites a raced stale success with pending', () => {
  const invocations = [];
  const successRequest = buildTrustedPrStatusRequest(baseEnvironment);
  let getCount = 0;
  let statusId = 100;
  const fakeSpawn = (command, args, options) => {
    invocations.push({ command, args, options });
    if (args[2] === 'GET') {
      getCount += 1;
      return {
        error: undefined,
        signal: null,
        status: 0,
        stdout: JSON.stringify({
          ref: 'refs/heads/main',
          object: {
            type: 'commit',
            sha: getCount === 1 ? baseEnvironment.EXPECTED_BASE_SHA : 'c'.repeat(40),
          },
        }),
      };
    }
    statusId += 1;
    const payload = JSON.parse(options.input);
    return {
      error: undefined,
      signal: null,
      status: 0,
      stdout: JSON.stringify({
        id: statusId,
        url: `${successRequest.expectedStatusUrlPrefix}${statusId}`,
        ...payload,
      }),
    };
  };

  assert.throws(
    () => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)),
    /no longer the current main commit/u,
  );
  assert.equal(invocations.length, 4);
  assert.equal(JSON.parse(invocations[1].options.input).state, 'success');
  assert.equal(JSON.parse(invocations[3].options.input).state, 'pending');
});

test('publisher overwrites success when the post-publication freshness lookup is uncertain', () => {
  const invocations = [];
  const successRequest = buildTrustedPrStatusRequest(baseEnvironment);
  let getCount = 0;
  let statusId = 200;
  const fakeSpawn = (command, args, options) => {
    invocations.push({ command, args, options });
    if (args[2] === 'GET') {
      getCount += 1;
      if (getCount === 2) {
        return { error: undefined, signal: null, status: 1, stdout: '' };
      }
      return {
        error: undefined,
        signal: null,
        status: 0,
        stdout: JSON.stringify({
          ref: 'refs/heads/main',
          object: { type: 'commit', sha: baseEnvironment.EXPECTED_BASE_SHA },
        }),
      };
    }
    statusId += 1;
    const payload = JSON.parse(options.input);
    return {
      error: undefined,
      signal: null,
      status: 0,
      stdout: JSON.stringify({
        id: statusId,
        url: `${successRequest.expectedStatusUrlPrefix}${statusId}`,
        ...payload,
      }),
    };
  };

  assert.throws(
    () => publishTrustedPrStatus(baseEnvironment, withCurrentPullRequest(fakeSpawn)),
    /post-publication freshness lookup failed/u,
  );
  assert.equal(invocations.length, 4);
  assert.equal(JSON.parse(invocations[1].options.input).state, 'success');
  assert.equal(JSON.parse(invocations[3].options.input).state, 'pending');
});

test('publisher rejects malformed provenance and response substitution', () => {
  for (const [field, value] of [
    ['EXPECTED_BASE_SHA', 'not-a-sha'],
    ['EXPECTED_HEAD_SHA', 'not-a-sha'],
    ['GITHUB_REPOSITORY', 'invalid repository'],
    ['GITHUB_RUN_ID', '0'],
    ['GITHUB_SERVER_URL', 'https://example.com'],
    ['GITHUB_API_URL', 'https://example.com/api'],
    ['STATUS_STATE', 'neutral'],
    ['GH_TOKEN', ''],
  ]) {
    assert.throws(
      () => buildTrustedPrStatusRequest({ ...baseEnvironment, [field]: value }),
      Error,
      `${field} must fail closed`,
    );
  }

  const request = buildTrustedPrStatusRequest(baseEnvironment);
  assert.throws(
    () => validateTrustedBaseRefResponse(JSON.stringify({
      ref: 'refs/heads/main',
      object: { type: 'commit', sha: 'c'.repeat(40) },
    }), request),
    /no longer the current main commit/u,
  );
  assert.throws(
    () => validateTrustedPrStatusResponse(JSON.stringify({
      id: 42,
      url: `${request.expectedStatusUrlPrefix}42`,
      context: 'attacker/context',
      state: request.payload.state,
      target_url: request.payload.target_url,
      description: request.payload.description,
    }), request),
    /changed the trusted status binding/u,
  );
  assert.throws(
    () => validateTrustedPrStatusResponse(JSON.stringify({
      id: 42,
      url: `${request.expectedStatusUrlPrefix}41`,
      context: request.payload.context,
      state: request.payload.state,
      target_url: request.payload.target_url,
      description: request.payload.description,
    }), request),
    /changed the trusted status binding/u,
  );
});
