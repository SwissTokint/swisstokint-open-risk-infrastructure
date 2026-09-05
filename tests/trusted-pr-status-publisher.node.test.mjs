import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTrustedPrStatusRequest,
  publishTrustedPrStatus,
  TRUSTED_PR_STATUS_CONTEXT,
  validateTrustedPrStatusResponse,
} from '../scripts/publish-trusted-pr-status.mjs';

const baseEnvironment = Object.freeze({
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
  assert.deepEqual(request.payload, {
    state: 'success',
    target_url: `https://github.com/${baseEnvironment.GITHUB_REPOSITORY}/actions/runs/${baseEnvironment.GITHUB_RUN_ID}`,
    description: 'Trusted exact-head security gate succeeded.',
    context: TRUSTED_PR_STATUS_CONTEXT,
  });
  assert.equal(JSON.stringify(request).includes(baseEnvironment.GH_TOKEN), false);
});

test('publisher sends only the fixed status payload through the trusted gh path', () => {
  let invocation = null;
  const request = buildTrustedPrStatusRequest(baseEnvironment);
  const response = {
    id: 42,
    url: request.expectedApiUrl,
    context: request.payload.context,
    state: request.payload.state,
    target_url: request.payload.target_url,
    description: request.payload.description,
  };
  const fakeSpawn = (command, args, options) => {
    invocation = { command, args, options };
    return { error: undefined, signal: null, status: 0, stdout: JSON.stringify(response) };
  };

  assert.deepEqual(publishTrustedPrStatus(baseEnvironment, fakeSpawn), { id: 42, state: 'success' });
  assert.equal(invocation.command, '/usr/bin/gh');
  assert.deepEqual(invocation.args, ['api', '--method', 'POST', request.apiPath, '--input', '-']);
  assert.deepEqual(JSON.parse(invocation.options.input), request.payload);
  assert.equal(invocation.options.input.includes(baseEnvironment.GH_TOKEN), false);
});

test('publisher rejects malformed provenance and response substitution', () => {
  for (const [field, value] of [
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
    () => validateTrustedPrStatusResponse(JSON.stringify({
      id: 42,
      url: request.expectedApiUrl,
      context: 'attacker/context',
      state: request.payload.state,
      target_url: request.payload.target_url,
      description: request.payload.description,
    }), request),
    /changed the trusted status binding/u,
  );
});
