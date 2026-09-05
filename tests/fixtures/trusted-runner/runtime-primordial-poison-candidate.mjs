export function unsafeSnapshot() {
  Object.getPrototypeOf = () => null;
  Object.isFrozen = () => true;
  return {};
}
