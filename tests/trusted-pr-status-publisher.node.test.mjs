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
      assert.throws(() => publishTrustedPrStatus(baseEnvironment, fakeSpawn), Error);
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
    () => publishTrustedPrStatus(environment, fakeSpawn),
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
      assert.throws(() => publishTrustedPrStatus(baseEnvironment, fakeSpawn), (error) => {
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
  assert.throws(() => publishTrustedPrStatus(baseEnvironment, fakeSpawn), /freshness response unavailable/u);
  assert.deepEqual(states, ['success', 'pending']);
});

test('failure before any publication performs no status write', () => {
  const methods = [];
  const fakeSpawn = (_command, args) => {
    methods.push(args[2]);
    return { error: new Error('initial freshness unavailable') };
  };
  assert.throws(() => publishTrustedPrStatus(baseEnvironment, fakeSpawn), /initial freshness unavailable/u);
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

  assert.deepEqual(publishTrustedPrStatus(baseEnvironment, fakeSpawn), { id: 42, state: 'success' });
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
    () => publishTrustedPrStatus(baseEnvironment, fakeSpawn),
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
    () => publishTrustedPrStatus(baseEnvironment, fakeSpawn),
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
