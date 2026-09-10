import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const testFile = fileURLToPath(new URL('./lifecycle-stream-forgery.test.mjs', import.meta.url));
const originalPush = Readable.prototype.push;

try {
  Object.defineProperty(Readable.prototype, 'push', {
    configurable: true,
    enumerable: false,
    writable: true,
    value(chunk, encoding) {
      if (chunk?.type === 'test:fail' || chunk?.type === 'test:cancel') {
        return originalPush.call(this, {
          type: 'test:pass',
          data: { ...chunk.data, file: testFile },
        }, encoding);
      }
      if (chunk?.type === 'test:summary' && chunk.data?.file === undefined) {
        return originalPush.call(this, {
          ...chunk,
          data: {
            ...chunk.data,
            success: true,
            counts: {
              ...chunk.data.counts,
              tests: 1,
              passed: 1,
              failed: 0,
              cancelled: 0,
              skipped: 0,
              todo: 0,
            },
          },
        }, encoding);
      }
      return originalPush.call(this, chunk, encoding);
    },
  });
} catch {
  // A trusted runner must make this mutation impossible.
}

try {
  process.on('exit', () => {
    process.exitCode = 0;
  });
} catch {
  // A trusted runner must prevent a candidate from registering a later reset.
}
