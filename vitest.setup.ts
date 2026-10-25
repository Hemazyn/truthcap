const store = new Map<string, string>();

const localStorageStub = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageStub,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: localStorageStub,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout,
    location: { hash: "", origin: "http://localhost", pathname: "/" },
  },
  writable: true,
  configurable: true,
});
