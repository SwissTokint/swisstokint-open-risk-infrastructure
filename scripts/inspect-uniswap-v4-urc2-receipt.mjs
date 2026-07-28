import { fetchAndAnalyzeUrc2Receipt } from "../sdk/typescript/uniswap-v4-urc2-receipt.mjs";

const rpcUrl = process.env.UNISWAP_RPC_URL;
const transactionHash = process.argv[2];

if (!rpcUrl || !transactionHash) {
  console.error(
    "Usage: UNISWAP_RPC_URL=https://... node scripts/inspect-uniswap-v4-urc2-receipt.mjs <tx-hash>"
  );
  process.exitCode = 2;
} else {
  try {
    const report = await fetchAndAnalyzeUrc2Receipt(rpcUrl, transactionHash);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.validCurrentUrc2Evidence) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
