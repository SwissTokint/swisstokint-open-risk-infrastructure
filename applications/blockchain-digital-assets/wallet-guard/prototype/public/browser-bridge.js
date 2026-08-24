const ANVIL_CHAIN_ID = '0x7a69';
const POLL_MS = 250;
const EIP6963_ANNOUNCE_WAIT_MS = 250;
const METAMASK_RDNS = 'io.metamask';
const BLOCK_HASH_PATTERN = /^0x[0-9a-f]{64}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const connectButton = document.querySelector('#connect');
const denyButton = document.querySelector('#deny');
const allowButton = document.querySelector('#allow');
const walletStatus = document.querySelector('#wallet-status');
const resultView = document.querySelector('#result');

let activeAccount = null;
let activeProvider = null;
let activeProviderInfo = null;
let bridgeRunning = false;
let sessionClosed = false;

function lowerAccount(value) {
  return typeof value === 'string' ? value.toLowerCase() : null;
}

function canonicalQuantity(value, label) {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/u.test(value)) {
    throw new Error(`${label} invalide`);
  }
  return value;
}

function canonicalBlock(value, expectedNumber, label) {
  if (!value || typeof value !== 'object'
      || value.number !== expectedNumber
      || typeof value.hash !== 'string'
      || !BLOCK_HASH_PATTERN.test(value.hash)) {
    throw new Error(`${label} invalide`);
  }
  return { number: value.number, hash: value.hash };
}

// EIP-6963 identifies an announced provider but does not authenticate extension
// code. This prototype therefore retains a dedicated, disposable browser
// profile as an explicit operational limit.
async function selectUnambiguousMetaMask() {
  const announcements = [];
  let malformedMetaMaskAnnouncement = false;
  const listener = (event) => {
    const detail = event?.detail;
    if (detail?.info?.rdns !== METAMASK_RDNS) return;
    if (!detail || typeof detail !== 'object'
        || typeof detail.info?.uuid !== 'string'
        || !UUID_PATTERN.test(detail.info.uuid)
        || typeof detail.info?.name !== 'string'
        || !detail.provider
        || typeof detail.provider.request !== 'function'
        || typeof detail.provider.on !== 'function') {
      malformedMetaMaskAnnouncement = true;
      return;
    }
    announcements.push(detail);
  };
  window.addEventListener('eip6963:announceProvider', listener);
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise((resolve) => setTimeout(resolve, EIP6963_ANNOUNCE_WAIT_MS));
  } finally {
    window.removeEventListener('eip6963:announceProvider', listener);
  }
  if (malformedMetaMaskAnnouncement || announcements.length !== 1) {
    throw new Error(
      'Annonce MetaMask EIP-6963 absente, dupliquée ou ambiguë; utiliser un profil dédié',
    );
  }
  const [{ info, provider }] = announcements;
  return Object.freeze({
    provider,
    info: Object.freeze({ uuid: info.uuid, name: info.name, rdns: info.rdns }),
  });
}

async function getJson(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  if (!response.ok || response.headers.get('content-type') !== 'application/json; charset=utf-8') {
    throw new Error(`${path} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function assertCleanBrowserBoundary() {
  if (!window.isSecureContext || window.opener !== null
      || window.location.protocol !== 'http:'
      || window.location.hostname !== '127.0.0.1') {
    throw new Error('Contexte navigateur loopback isolé requis');
  }
  if (navigator.serviceWorker?.controller) {
    throw new Error('Service worker actif: utiliser un profil navigateur propre');
  }
  const registrations = navigator.serviceWorker
    ? await navigator.serviceWorker.getRegistrations()
    : [];
  if (registrations.length !== 0) {
    throw new Error('Service worker enregistré: utiliser un profil navigateur propre');
  }
  if (window.caches && (await window.caches.keys()).length !== 0) {
    throw new Error('Cache applicatif présent: utiliser un profil navigateur propre');
  }
  if (window.localStorage.length !== 0 || window.sessionStorage.length !== 0) {
    throw new Error('Stockage applicatif présent: utiliser un profil navigateur propre');
  }
}

function validateConfig(input) {
  const keys = Object.keys(input ?? {}).sort();
  if (keys.join(',') !== 'chain_id,host_origin,rpc_url'
      || input.chain_id !== ANVIL_CHAIN_ID
      || input.host_origin !== window.location.origin) {
    throw new Error('Configuration hôte invalide');
  }
  const rpc = new URL(input.rpc_url);
  if (rpc.protocol !== 'http:' || rpc.hostname !== '127.0.0.1'
      || rpc.port === '' || rpc.pathname !== '/' || rpc.search !== '' || rpc.hash !== ''
      || rpc.username !== '' || rpc.password !== '') {
    throw new Error('RPC Anvil loopback invalide');
  }
  return { chainId: input.chain_id, rpcUrl: rpc.href };
}

async function postJson(path, value) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

async function ensureAnvil(config, provider) {
  let chainId = await provider.request({ method: 'eth_chainId', params: [] });
  if (chainId !== config.chainId) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
    } catch (error) {
      if (error?.code !== 4902) throw error;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: config.chainId,
          chainName: 'Anvil POM-RX (local)',
          nativeCurrency: { name: 'Anvil ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [config.rpcUrl],
        }],
      });
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
    }
    chainId = await provider.request({ method: 'eth_chainId', params: [] });
  }
  if (chainId !== config.chainId) throw new Error('MetaMask n’est pas sur Anvil 31337');
  const accounts = await provider.request({ method: 'eth_requestAccounts', params: [] });
  const account = lowerAccount(accounts?.[0]);
  if (!/^0x[0-9a-f]{40}$/u.test(account ?? '')) throw new Error('Compte burner invalide');
  return { chainId, account };
}

async function sampleWalletContext() {
  const chainId = await activeProvider.request({ method: 'eth_chainId', params: [] });
  const accounts = await activeProvider.request({ method: 'eth_accounts', params: [] });
  return { chainId, account: lowerAccount(accounts?.[0]) };
}

async function sampleWalletChainView() {
  const context = await sampleWalletContext();
  const genesis = canonicalBlock(
    await activeProvider.request({ method: 'eth_getBlockByNumber', params: ['0x0', false] }),
    '0x0',
    'Bloc genesis MetaMask',
  );
  const latestBlockNumber = canonicalQuantity(
    await activeProvider.request({ method: 'eth_blockNumber', params: [] }),
    'Numéro de bloc MetaMask',
  );
  const latest = canonicalBlock(
    await activeProvider.request({
      method: 'eth_getBlockByNumber',
      params: [latestBlockNumber, false],
    }),
    latestBlockNumber,
    'Dernier bloc MetaMask',
  );
  return Object.freeze({
    ...context,
    genesisHash: genesis.hash,
    latestBlockNumber,
    latestBlockHash: latest.hash,
  });
}

function sameWalletChainView(left, right) {
  return left.chainId === right.chainId
    && left.account === right.account
    && left.genesisHash === right.genesisHash
    && left.latestBlockNumber === right.latestBlockNumber
    && left.latestBlockHash === right.latestBlockHash;
}

function contextMatches(command, sample) {
  return sample.chainId === command.expected_chain_id
    && sample.account === command.expected_account;
}

function boundedErrorCode(error) {
  if (error?.code === 4001) return 'USER_REJECTED';
  if (!activeProvider) return 'WALLET_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

async function bindWalletView(command, view) {
  await postJson('/bridge/view', {
    schema_version: command.schema_version,
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    chain_id: view.chainId,
    account: view.account,
    genesis_hash: view.genesisHash,
    latest_block_number: view.latestBlockNumber,
    latest_block_hash: view.latestBlockHash,
  });
}

async function deliver(command, outcome, observed) {
  await postJson('/bridge/result', {
    schema_version: command.schema_version,
    session_id: command.session_id,
    sequence: command.sequence,
    request_id: command.request_id,
    observed_chain_id: observed.chainId,
    observed_account: observed.account,
    outcome: outcome.result === undefined ? 'error' : 'result',
    result: outcome.result ?? null,
    error: outcome.result === undefined ? { code: outcome.errorCode } : null,
  });
}

async function processCommand(command) {
  const first = await sampleWalletChainView();
  const second = await sampleWalletChainView();
  if (!contextMatches(command, first) || !contextMatches(command, second)
      || !sameWalletChainView(first, second)) {
    await deliver(command, { errorCode: 'CONTEXT_CHANGED' }, second);
    sessionClosed = true;
    return;
  }

  try {
    await bindWalletView(command, second);
  } catch (error) {
    resultView.textContent = `Vue MetaMask/Node refusée avant envoi: ${error.message}`;
    sessionClosed = true;
    return;
  }

  let result;
  try {
    result = await activeProvider.request(command.request);
  } catch (error) {
    const after = await sampleWalletContext().catch(() => second);
    await deliver(command, { errorCode: boundedErrorCode(error) }, after);
    sessionClosed = true;
    return;
  }

  const after = await sampleWalletContext().catch(() => ({
    chainId: 'unavailable',
    account: 'unavailable',
  }));
  try {
    // Preserve the transaction hash even when the post-prompt context changed.
    // The server will reject it as a normal success, mark the operation
    // ambiguous, and reconcile the bound hash against its configured Anvil.
    await deliver(command, { result }, after);
  } catch (error) {
    resultView.textContent = `Hash MetaMask à réconcilier manuellement: ${String(result)} (${error.message})`;
    sessionClosed = true;
    return;
  }
  if (!contextMatches(command, after)) {
    sessionClosed = true;
  }
}

async function bridgeLoop() {
  if (bridgeRunning) return;
  bridgeRunning = true;
  while (!sessionClosed) {
    try {
      const response = await fetch('/bridge/next', { credentials: 'same-origin' });
      if (response.status === 200) await processCommand(await response.json());
      else if (response.status === 410) sessionClosed = true;
      else if (response.status !== 204) throw new Error(`bridge HTTP ${response.status}`);
    } catch (error) {
      resultView.textContent = `Bridge fermé: ${error.message}`;
      sessionClosed = true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  denyButton.disabled = true;
  allowButton.disabled = true;
}

async function closeForContextChange() {
  if (sessionClosed) return;
  sessionClosed = true;
  await postJson('/bridge/close', { code: 'CONTEXT_CHANGED' }).catch(() => {});
  walletStatus.textContent = 'Session fermée après changement de contexte';
}

connectButton.addEventListener('click', async () => {
  connectButton.disabled = true;
  try {
    await assertCleanBrowserBoundary();
    const config = validateConfig(await getJson('/api/config'));
    const selection = await selectUnambiguousMetaMask();
    activeProvider = selection.provider;
    activeProviderInfo = selection.info;
    const context = await ensureAnvil(config, activeProvider);
    activeAccount = context.account;
    const chainView = await sampleWalletChainView();
    if (chainView.chainId !== context.chainId || chainView.account !== context.account) {
      throw new Error('Contexte MetaMask instable avant handshake');
    }
    const handshake = await postJson('/api/handshake', {
      chain_id: context.chainId,
      account: context.account,
      genesis_hash: chainView.genesisHash,
      latest_block_number: chainView.latestBlockNumber,
      latest_block_hash: chainView.latestBlockHash,
    });
    walletStatus.textContent = JSON.stringify({
      ...handshake,
      provider: activeProviderInfo,
      operational_limit: 'Profil navigateur dédié et burner jetable requis',
    }, null, 2);
    denyButton.disabled = false;
    allowButton.disabled = false;
    activeProvider.on?.('accountsChanged', closeForContextChange);
    activeProvider.on?.('chainChanged', closeForContextChange);
    activeProvider.on?.('disconnect', closeForContextChange);
    bridgeLoop();
  } catch (error) {
    walletStatus.textContent = error.message;
    connectButton.disabled = false;
  }
});

denyButton.addEventListener('click', async () => {
  resultView.textContent = 'Test DENY en cours…';
  try {
    resultView.textContent = JSON.stringify(await postJson('/api/deny', {}), null, 2);
  } catch (error) {
    resultView.textContent = error.message;
  }
});

allowButton.addEventListener('click', async () => {
  if (!activeAccount) return;
  allowButton.disabled = true;
  resultView.textContent = 'En attente de confirmation MetaMask…';
  try {
    resultView.textContent = JSON.stringify(await postJson('/api/allow', {}), null, 2);
  } catch (error) {
    resultView.textContent = error.message;
  }
});
