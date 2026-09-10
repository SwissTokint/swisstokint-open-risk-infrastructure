import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TRUSTED_PR_STATUS_CONTEXT = 'pom-rx/trusted-exact-head';

const STATUS_DESCRIPTIONS = Object.freeze({
  pending: 'Trusted exact-head security gate is in progress.',
  success: 'Trusted exact-head security gate succeeded.',
  failure: 'Trusted exact-head security gate failed.',
});

function requiredString(environment, name) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

export function buildTrustedPrStatusRequest(environment) {
  const repository = requiredString(environment, 'GITHUB_REPOSITORY');
  const baseSha = requiredString(environment, 'EXPECTED_BASE_SHA');
  const headSha = requiredString(environment, 'EXPECTED_HEAD_SHA');
  const runId = requiredString(environment, 'GITHUB_RUN_ID');
  const serverUrl = requiredString(environment, 'GITHUB_SERVER_URL');
  const apiUrl = requiredString(environment, 'GITHUB_API_URL');
  const state = requiredString(environment, 'STATUS_STATE');
  requiredString(environment, 'GH_TOKEN');

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) {
    throw new Error('invalid GITHUB_REPOSITORY');
  }
  if (!/^[0-9a-f]{40}$/u.test(baseSha)) {
    throw new Error('invalid EXPECTED_BASE_SHA');
  }
  if (!/^[0-9a-f]{40}$/u.test(headSha)) {
    throw new Error('invalid EXPECTED_HEAD_SHA');
  }
  if (!/^[1-9][0-9]*$/u.test(runId)) {
    throw new Error('invalid GITHUB_RUN_ID');
  }
  if (serverUrl !== 'https://github.com' || apiUrl !== 'https://api.github.com') {
    throw new Error('unexpected GitHub endpoint');
  }
  if (!Object.hasOwn(STATUS_DESCRIPTIONS, state)) {
    throw new Error('invalid STATUS_STATE');
  }

  // Pending only withdraws evidence. Invalidation must remain possible after a
  // PR closes, changes its base/head, or loses its source repository.
  let pullRequest = null;
  if (state !== 'pending') {
    const numberText = requiredString(environment, 'EXPECTED_PR_NUMBER');
    const number = Number(numberText);
    const headRepository = requiredString(environment, 'EXPECTED_HEAD_REPOSITORY');
    if (!/^[1-9][0-9]*$/u.test(numberText) || !Number.isSafeInteger(number)) {
      throw new Error('invalid EXPECTED_PR_NUMBER');
    }
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(headRepository)) {
      throw new Error('invalid EXPECTED_HEAD_REPOSITORY');
    }
    pullRequest = Object.freeze({
      apiPath: `repos/${repository}/pulls/${numberText}`,
      url: `${apiUrl}/repos/${repository}/pulls/${numberText}`,
      number,
      repository,
      headRepository,
      headSha,
    });
  }

  const targetUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
  return Object.freeze({
    apiPath: `repos/${repository}/statuses/${headSha}`,
    baseRefPath: `repos/${repository}/git/ref/heads/main`,
    expectedBaseSha: baseSha,
    pullRequest,
    expectedStatusUrlPrefix: `${apiUrl}/repos/${repository}/statuses/`,
    payload: Object.freeze({
      state,
      target_url: targetUrl,
      description: STATUS_DESCRIPTIONS[state],
      context: TRUSTED_PR_STATUS_CONTEXT,
    }),
  });
}

export function validateTrustedBaseRefResponse(responseText, request) {
  const body = JSON.parse(responseText);
  if (
    typeof body !== 'object'
    || body === null
    || Array.isArray(body)
    || body.ref !== 'refs/heads/main'
    || typeof body.object !== 'object'
    || body.object === null
    || Array.isArray(body.object)
    || body.object.type !== 'commit'
    || body.object.sha !== request.expectedBaseSha
  ) {
    throw new Error('trusted PR base is no longer the current main commit');
  }
  return Object.freeze({ sha: body.object.sha });
}

export function validateTrustedPullRequestResponse(responseText, request) {
  const body = JSON.parse(responseText);
  const expected = request.pullRequest;
  if (
    expected === null
    || typeof body !== 'object'
    || body === null
    || Array.isArray(body)
    || body.url !== expected.url
    || body.number !== expected.number
    || body.state !== 'open'
    || body.merged !== false
    || body.merged_at !== null
    || body.base?.ref !== 'main'
    || body.base?.sha !== request.expectedBaseSha
    || body.base?.repo?.full_name !== expected.repository
    || body.head?.sha !== expected.headSha
    || body.head?.repo?.full_name !== expected.headRepository
  ) {
    throw new Error('trusted PR is no longer open on the expected base and head');
  }
}

export function validateTrustedPrStatusResponse(responseText, request) {
  const body = JSON.parse(responseText);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('commit-status API returned an invalid body');
  }
  if (!Number.isSafeInteger(body.id) || body.id < 1) {
    throw new Error('commit-status API returned an invalid status id');
  }
  const expectedStatusUrl = `${request.expectedStatusUrlPrefix}${body.id}`;
  if (
    body.url !== expectedStatusUrl
    || body.context !== request.payload.context
    || body.state !== request.payload.state
    || body.target_url !== request.payload.target_url
    || body.description !== request.payload.description
  ) {
    throw new Error('commit-status API response changed the trusted status binding');
  }
  return Object.freeze({ id: body.id, state: body.state });
}

export function publishTrustedPrStatus(environment = process.env, spawn = spawnSync) {
  const request = buildTrustedPrStatusRequest(environment);
  const commonOptions = Object.freeze({
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20_000,
  });
  function checkPullRequest() {
    if (request.pullRequest === null) return;
    const result = spawn(
      '/usr/bin/gh',
      ['api', '--method', 'GET', request.pullRequest.apiPath, '--hostname', 'github.com'],
      commonOptions,
    );
    if (result.error) throw result.error;
    if (result.signal !== null || result.status !== 0) {
      throw new Error('trusted PR lifecycle lookup failed');
    }
    validateTrustedPullRequestResponse(result.stdout, request);
  }
  const baseResult = spawn(
    '/usr/bin/gh',
    ['api', '--method', 'GET', request.baseRefPath, '--hostname', 'github.com'],
    commonOptions,
  );

  if (baseResult.error) throw baseResult.error;
  if (baseResult.signal !== null || baseResult.status !== 0) {
    throw new Error('trusted main-ref freshness lookup failed');
  }
  validateTrustedBaseRefResponse(baseResult.stdout, request);
  checkPullRequest();

  function invalidateUncertainPublication(cause) {
    // Recovery must keep the identity captured before the uncertain write.
    const invalidationRequest = Object.freeze({
      ...request,
      payload: Object.freeze({
        ...request.payload,
        state: 'pending',
        description: STATUS_DESCRIPTIONS.pending,
      }),
    });
    try {
      const invalidationResult = spawn(
        '/usr/bin/gh',
        ['api', '--method', 'POST', invalidationRequest.apiPath, '--input', '-', '--hostname', 'github.com'],
        {
          input: JSON.stringify(invalidationRequest.payload),
          ...commonOptions,
        },
      );
      if (invalidationResult.error) throw invalidationResult.error;
      if (invalidationResult.signal !== null || invalidationResult.status !== 0) {
        throw new Error('trusted stale-status invalidation failed');
      }
      validateTrustedPrStatusResponse(invalidationResult.stdout, invalidationRequest);
    } catch (invalidationError) {
      throw new AggregateError(
        [cause, invalidationError],
        'uncertain trusted status could not be invalidated',
      );
    }
    throw cause;
  }

  try {
    // Once POST is attempted, even a local timeout or unreadable response can
    // leave a server-side status behind. Every subsequent failure invalidates.
    const result = spawn(
      '/usr/bin/gh',
      ['api', '--method', 'POST', request.apiPath, '--input', '-', '--hostname', 'github.com'],
      {
        input: JSON.stringify(request.payload),
        ...commonOptions,
      },
    );
    if (result.error) throw result.error;
    if (result.signal !== null || result.status !== 0) {
      throw new Error('trusted commit-status publication failed');
    }
    const published = validateTrustedPrStatusResponse(result.stdout, request);

    const postPublishBaseResult = spawn(
      '/usr/bin/gh',
      ['api', '--method', 'GET', request.baseRefPath, '--hostname', 'github.com'],
      commonOptions,
    );
    if (postPublishBaseResult.error) throw postPublishBaseResult.error;
    if (postPublishBaseResult.signal !== null || postPublishBaseResult.status !== 0) {
      throw new Error('trusted post-publication freshness lookup failed');
    }
    validateTrustedBaseRefResponse(postPublishBaseResult.stdout, request);
    // Observe departure even when the independent invalidator's pending POST
    // preceded this terminal POST. Lookups/writes are not an atomic barrier.
    checkPullRequest();
    return published;
  } catch (error) {
    invalidateUncertainPublication(error);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  publishTrustedPrStatus();
}
