import { readFile } from "node:fs/promises";
import { evaluateUrcConformance } from "../sdk/typescript/uniswap-v4-urc-conformance.mjs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/validate-uniswap-v4-urc.mjs <fixture.json>");
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(await readFile(inputPath, "utf8"));
    const report = evaluateUrcConformance(input);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
