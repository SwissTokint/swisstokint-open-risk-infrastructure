import { registerHooks } from 'node:module';

import { load } from './trusted-test-loader.mjs';

registerHooks({ load });
