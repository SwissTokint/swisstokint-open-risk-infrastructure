import { resolve } from 'node:path';
import { DefaultSerializer } from 'node:v8';

const serializer = new DefaultSerializer();
serializer.writeHeader();
const headerLength = serializer.releaseBuffer().length;
serializer.writeHeader();
serializer.writeRawBytes(Buffer.alloc(4));
serializer.writeHeader();
serializer.writeValue({
  type: 'test:summary',
  data: {
    file: resolve('tests/fixtures/trusted-runner/forged-summary.test.mjs'),
    success: true,
    counts: { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 },
  },
});
const framedSummary = serializer.releaseBuffer();
const payloadLength = framedSummary.length - (4 + headerLength);
framedSummary.set([
  payloadLength >> 24 & 0xff,
  payloadLength >> 16 & 0xff,
  payloadLength >> 8 & 0xff,
  payloadLength & 0xff,
], headerLength);
process.stdout.write(framedSummary);
process.exit(0);
