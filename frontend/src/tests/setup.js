import '@testing-library/jest-dom';

// Polyfills and mocks for DOM APIs in Vitest JSDOM
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
    window.URL.revokeObjectURL = () => {};
  }

  if (!navigator.clipboard) {
    navigator.clipboard = {
      writeText: async () => {},
      readText: async () => '',
    };
  }
}
