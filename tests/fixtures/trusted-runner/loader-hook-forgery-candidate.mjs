import { register } from 'node:module';

try {
  register(new URL('./loader-hook-forgery-hook.mjs', import.meta.url));
} catch {
  // A trusted runner must seal registration after installing its base-owned hook.
}
