// Example: set up global mocks or test config here

// Example: mock localStorage if needed
globalThis.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};