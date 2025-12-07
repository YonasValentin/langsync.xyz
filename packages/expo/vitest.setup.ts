import { vi } from 'vitest';

vi.mock('react', () => ({
  __esModule: true,
  useCallback: (fn: unknown) => fn,
  useMemo: (factory: () => unknown) => factory(),
}));

const asyncStorageStore = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => {
  const AsyncStorage = {
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStorageStore.set(key, value);
    }),
    getItem: vi.fn(async (key: string) => {
      return asyncStorageStore.has(key) ? asyncStorageStore.get(key)! : null;
    }),
    removeItem: vi.fn(async (key: string) => {
      asyncStorageStore.delete(key);
    }),
    getAllKeys: vi.fn(async () => Array.from(asyncStorageStore.keys())),
    multiRemove: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => asyncStorageStore.delete(key));
    }),
    clear: vi.fn(async () => {
      asyncStorageStore.clear();
    }),
    /**
     * Testing utility to reset the in-memory store.
     */
    __reset: () => asyncStorageStore.clear(),
  } as const;

  return {
    __esModule: true,
    default: AsyncStorage,
  };
});

vi.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: vi.fn(async () => ({ isConnected: true })),
  },
}));
