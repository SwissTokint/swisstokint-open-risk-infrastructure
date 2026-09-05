import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

Object.defineProperty(fs, 'readFileSync', {
  ...Object.getOwnPropertyDescriptor(fs, 'readFileSync'),
  value() {
    return Buffer.from('fabricated trusted contents');
  },
});
syncBuiltinESMExports();
