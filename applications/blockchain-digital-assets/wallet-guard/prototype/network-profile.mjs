import { isIP } from 'node:net';

const ANVIL_CHAIN_ID = '0x7a69';
const SEPOLIA_CHAIN_ID = '0xaa36a7';

function canonicalLoopbackRpcUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username
      || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('Anvil RPC must be an exact loopback HTTP root');
  }
  const port = Number(url.port || 80);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('Anvil RPC port is invalid');
  }
  return `http://127.0.0.1:${String(port)}/`;
}

function canonicalPublicHttpsRpcUrl(value, label) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.hostname === 'localhost' || url.hostname.endsWith('.local')
      || !url.hostname.includes('.') || isIP(url.hostname) !== 0) {
    throw new TypeError(`${label} must be a public HTTPS URL without userinfo, query or fragment`);
  }
  return url.href;
}

export function createWalletGuardPrototypeNetworkProfile({
  network = 'anvil',
  rpcUrl = 'http://127.0.0.1:8545/',
  walletRpcUrl = null,
} = {}) {
  if (network === 'anvil') {
    if (walletRpcUrl !== null) {
      throw new TypeError('Anvil does not accept a separate wallet RPC');
    }
    const canonicalRpcUrl = canonicalLoopbackRpcUrl(rpcUrl);
    return Object.freeze({
      network: 'anvil',
      chainId: ANVIL_CHAIN_ID,
      chainName: 'Anvil POM-RX (local)',
      nativeCurrency: Object.freeze({ name: 'Anvil ETH', symbol: 'ETH', decimals: 18 }),
      walletRpcUrl: canonicalRpcUrl,
      observerRpcUrl: canonicalRpcUrl,
      chainViewTag: 'latest',
      requiredConfirmations: 1,
      rpcTimeoutMs: 2_000,
      receiptPollMs: 250,
      receiptTimeoutMs: 10_000,
      observerEndpointSeparateConfigured: false,
    });
  }
  if (network !== 'sepolia') throw new TypeError('prototype network is unsupported');
  if (walletRpcUrl !== null) {
    throw new TypeError('Sepolia wallet RPC must remain inside MetaMask');
  }
  const canonicalObserverRpcUrl = canonicalPublicHttpsRpcUrl(rpcUrl, 'Sepolia observer RPC');
  return Object.freeze({
    network: 'sepolia',
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia POM-RX burner',
    nativeCurrency: Object.freeze({ name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }),
    walletRpcUrl: null,
    observerRpcUrl: canonicalObserverRpcUrl,
    chainViewTag: 'safe',
    requiredConfirmations: 2,
    rpcTimeoutMs: 10_000,
    receiptPollMs: 2_500,
    receiptTimeoutMs: 1_200_000,
    observerEndpointSeparateConfigured: false,
  });
}

export const WALLET_GUARD_PROTOTYPE_CHAIN_IDS = Object.freeze({
  anvil: ANVIL_CHAIN_ID,
  sepolia: SEPOLIA_CHAIN_ID,
});
