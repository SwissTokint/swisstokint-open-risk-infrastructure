// Import the trusted transport before the HTTP host or any other application
// module. This preserves the clean-process bootstrap contract reviewed in #131.
const transport = await import('../trusted-provider-transport.mjs');
const { createWalletGuardPrototypeServer } = await import('./server.mjs');

const network = process.env.POMRX_WG_NETWORK ?? 'anvil';
let rpcUrl;
let walletRpcUrl = null;
let journalPath = null;
if (network === 'anvil') {
  rpcUrl = process.env.POMRX_WG_ANVIL_RPC ?? 'http://127.0.0.1:8545/';
} else if (network === 'sepolia') {
  rpcUrl = process.env.POMRX_WG_SEPOLIA_OBSERVER_RPC;
  journalPath = process.env.POMRX_WG_SEPOLIA_JOURNAL;
  if (!rpcUrl || !journalPath) {
    throw new Error(
      'Sepolia requires explicit POMRX_WG_SEPOLIA_OBSERVER_RPC and '
      + 'POMRX_WG_SEPOLIA_JOURNAL values',
    );
  }
} else {
  throw new Error('POMRX_WG_NETWORK must be exactly anvil or sepolia');
}

const prototype = createWalletGuardPrototypeServer({
  createControlledCallbackTransport:
    transport.createWalletGuardControlledCallbackProviderTransport,
  createTrustedGateway: transport.createWalletGuardTrustedProviderGateway,
  port: 0,
  network,
  rpcUrl,
  walletRpcUrl,
  journalPath,
});

const info = await prototype.listen();
process.stdout.write(
  `POM-RX Wallet Guard ${network} reference prototype\n`
  + `Open exactly once: ${info.launch_url}\n`,
);

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await prototype.close();
}

process.once('SIGINT', () => {
  close().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  close().finally(() => process.exit(0));
});
