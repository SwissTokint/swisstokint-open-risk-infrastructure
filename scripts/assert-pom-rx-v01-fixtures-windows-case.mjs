import { pathToFileURL } from 'node:url';

const [mode, modulePath, root, candidate] = process.argv.slice(2);
const contract = await import(pathToFileURL(modulePath));

try {
  if (mode === 'enumerate') contract.enumerateRegularFiles(root);
  else if (mode === 'read') contract.readRegularFile(root, candidate);
  else throw new Error(`unsupported Windows fixture case mode: ${mode}`);
  process.exitCode = 0;
} catch (error) {
  process.stdout.write(JSON.stringify({ code: error.code ?? 'UNEXPECTED_ERROR' }));
  process.exitCode = 9;
}
