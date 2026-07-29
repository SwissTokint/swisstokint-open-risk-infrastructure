import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  pomRxKeyId,
} from '../sdk/typescript/pom-rx-witness.mjs';

const defaultDirectory = path.join(os.homedir(), '.config', 'swisstokint');
const privateKeyPath = path.resolve(
  process.argv[2] ?? path.join(defaultDirectory, 'pom-rx-witness-private.pem'),
);
const publicKeyPath = path.resolve(
  process.argv[3] ?? path.join(defaultDirectory, 'pom-rx-witness-public.pem'),
);

if (privateKeyPath === publicKeyPath) {
  throw new Error('Private and public key paths must be different');
}

await fs.mkdir(path.dirname(privateKeyPath), { recursive: true, mode: 0o700 });
await fs.mkdir(path.dirname(publicKeyPath), { recursive: true, mode: 0o700 });

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' });
const publicPem = publicKey.export({ format: 'pem', type: 'spki' });

let privateHandle;
let publicHandle;
try {
  privateHandle = await fs.open(privateKeyPath, 'wx', 0o600);
  await privateHandle.writeFile(privatePem, 'utf8');
  publicHandle = await fs.open(publicKeyPath, 'wx', 0o644);
  await publicHandle.writeFile(publicPem, 'utf8');
} finally {
  await privateHandle?.close();
  await publicHandle?.close();
}

process.stdout.write(`${JSON.stringify({
  witness_key_id: pomRxKeyId(publicKey),
  private_key_path: privateKeyPath,
  public_key_path: publicKeyPath,
})}\n`);
