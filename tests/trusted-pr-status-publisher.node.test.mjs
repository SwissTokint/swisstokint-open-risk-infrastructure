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
  assert.deepEqual(invocations[0].args, ['api', '--method', 'GET', request.baseRefPath]);
  assert.equal(invocations[1].command, '/usr/bin/gh');
  assert.deepEqual(invocations[1].args, ['api', '--method', 'POST', request.apiPath, '--input', '-']);
  assert.deepEqual(JSON.parse(invocations[1].options.input), request.payload);
  assert.equal(invocations[1].options.input.includes(baseEnvironment.GH_TOKEN), false);
  assert.deepEqual(invocations[2].args, ['api', '--method', 'GET', request.baseRefPath]);
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
