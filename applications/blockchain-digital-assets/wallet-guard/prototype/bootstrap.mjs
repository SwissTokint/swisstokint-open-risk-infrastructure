// Import the trusted transport before the HTTP host or any other application
// module. This preserves the clean-process bootstrap contract reviewed in #131.
const transport = await import('../trusted-provider-transport.mjs');
const { createWalletGuardPrototypeServer } = await import('./server.mjs');

const rpcUrl = process.env.POMRX_WG_ANVIL_RPC ?? 'http://127.0.0.1:8545/';

const prototype = createWalletGuardPrototypeServer({
  createControlledCallbackTransport:
    transport.createWalletGuardControlledCallbackProviderTransport,
  createTrustedGateway: transport.createWalletGuardTrustedProviderGateway,
  port: 0,
  rpcUrl,
});

const info = await prototype.listen();
process.stdout.write(`POM-RX Wallet Guard reference prototype\nOpen exactly once: ${info.launch_url}\n`);

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
