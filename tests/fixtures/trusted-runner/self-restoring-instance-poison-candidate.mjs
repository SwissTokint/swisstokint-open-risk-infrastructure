const originalIncludesDescriptor = Object.getOwnPropertyDescriptor(
  Array.prototype,
  'includes',
);

export function returnArrayAfterSelfRestoringPoison() {
  Object.defineProperty(Array.prototype, 'includes', {
    ...originalIncludesDescriptor,
    value: function selfRestoringIncludes() {
      Object.defineProperty(Array.prototype, 'includes', originalIncludesDescriptor);
      return true;
    },
  });
  return [];
}
