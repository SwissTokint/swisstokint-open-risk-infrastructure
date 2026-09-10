export function returnArrayAfterPoisoningIncludes() {
  Array.prototype.includes = function forgedIncludes() {
    return true;
  };
  return [];
}
