// Import the trusted transport before the HTTP host or any other application
// module. This preserves the clean-process bootstrap contract reviewed in #131.
const transport = await import('../trusted-provider-transport.mjs');
const { createWalletGuardPrototypeServer } = await import('./server.mjs');
const { createWalletGuardDurableOperationJournal } = await import('./durable-operation-journal.mjs');

const rpcUrl = process.env.POMRX_WG_ANVIL_RPC ?? 'http://127.0.0.1:8545/';
const journal = createWalletGuardDurableOperationJournal({
  journalPath: process.env.POMRX_WG_JOURNAL,
  network: 'anvil',
  chainId: '0x7a69',
});
await journal.initialize();

let prototype;
let info;
try {
  prototype = createWalletGuardPrototypeServer({
    createControlledCallbackTransport:
      transport.createWalletGuardControlledCallbackProviderTransport,
    createTrustedGateway: transport.createWalletGuardTrustedProviderGateway,
    port: 0,
    rpcUrl,
    operationJournal: journal,
  });
  info = await prototype.listen();
} catch (error) {
  await journal.close();
  throw error;
}
process.stdout.write(`POM-RX Wallet Guard reference prototype\nOpen exactly once: ${info.launch_url}\n`);

let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await prototype.close();
}

process.once('SIGINT', () => {
  close().then(() => process.exit(0), () => process.exit(1));
});
process.once('SIGTERM', () => {
  close().then(() => process.exit(0), () => process.exit(1));
});
