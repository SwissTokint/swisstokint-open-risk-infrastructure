if (process.env.POMRX_WG_NETWORK !== undefined
    && process.env.POMRX_WG_NETWORK !== 'sepolia') {
  throw new Error('bootstrap-sepolia refuses a conflicting POMRX_WG_NETWORK value');
}
process.env.POMRX_WG_NETWORK = 'sepolia';
await import('./bootstrap.mjs');
