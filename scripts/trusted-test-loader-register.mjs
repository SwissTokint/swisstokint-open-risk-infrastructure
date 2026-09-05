import { register } from 'node:module';

register('./trusted-test-loader.mjs', import.meta.url);
