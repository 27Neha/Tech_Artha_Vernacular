import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Ultra-fast In-Memory + Resilient Persistent Storage Layer.
 *
 * 1. Serves cached reads in <0.1ms from in-memory Map so screens hydrate instantaneously.
 * 2. Gracefully handles Expo Go environments where AsyncStorage v3 native module is null,
 *    eliminating AsyncStorageError warnings and persisting compact keys via SecureStore.
 */

const memoryCache = new Map<string, string>();
let nativeStorageAvailable: boolean | null = null;

function sanitizeSecureKey(key: string): string {
  return `ta_kv_${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`.slice(0, 120);
}

export function getSyncCache(key: string): string | null {
  return memoryCache.has(key) ? (memoryCache.get(key) ?? null) : null;
}

export function setSyncCache(key: string, value: string): void {
  memoryCache.set(key, value);
}

export function installResilientStorage(): void {
  const storageAny = AsyncStorage as any;
  if (!storageAny || storageAny.__taResilientPatched) return;

  const origGetItem = typeof storageAny.getItem === 'function' ? storageAny.getItem.bind(storageAny) : null;
  const origSetItem = typeof storageAny.setItem === 'function' ? storageAny.setItem.bind(storageAny) : null;
  const origRemoveItem = typeof storageAny.removeItem === 'function' ? storageAny.removeItem.bind(storageAny) : null;
  const origClear = typeof storageAny.clear === 'function' ? storageAny.clear.bind(storageAny) : null;

  storageAny.getItem = async (key: string): Promise<string | null> => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) ?? null;
    }

    if (nativeStorageAvailable !== false && origGetItem) {
      try {
        const val = await origGetItem(key);
        nativeStorageAvailable = true;
        if (val != null) memoryCache.set(key, val);
        return val;
      } catch {
        nativeStorageAvailable = false;
      }
    }

    try {
      const fallback = await SecureStore.getItemAsync(sanitizeSecureKey(key));
      if (fallback != null) memoryCache.set(key, fallback);
      return fallback;
    } catch {
      return null;
    }
  };

  storageAny.setItem = async (key: string, value: string): Promise<void> => {
    const strVal = String(value);
    memoryCache.set(key, strVal);

    if (nativeStorageAvailable !== false && origSetItem) {
      try {
        await origSetItem(key, strVal);
        nativeStorageAvailable = true;
        return;
      } catch {
        nativeStorageAvailable = false;
      }
    }

    // SecureStore supports values up to ~2048 bytes; larger payloads stay in fast memoryCache
    if (strVal.length <= 1850) {
      try {
        await SecureStore.setItemAsync(sanitizeSecureKey(key), strVal);
      } catch {
        // Keep in-memory copy
      }
    }
  };

  storageAny.removeItem = async (key: string): Promise<void> => {
    memoryCache.delete(key);
    if (nativeStorageAvailable !== false && origRemoveItem) {
      try {
        await origRemoveItem(key);
        return;
      } catch {
        nativeStorageAvailable = false;
      }
    }
    try {
      await SecureStore.deleteItemAsync(sanitizeSecureKey(key));
    } catch {}
  };

  storageAny.clear = async (): Promise<void> => {
    memoryCache.clear();
    if (nativeStorageAvailable !== false && origClear) {
      try {
        await origClear();
      } catch {
        nativeStorageAvailable = false;
      }
    }
  };

  storageAny.multiGet = async (keys: readonly string[]): Promise<[string, string | null][]> => {
    return Promise.all(keys.map(async (k) => [k, await storageAny.getItem(k)] as [string, string | null]));
  };

  storageAny.multiSet = async (pairs: readonly [string, string][]): Promise<void> => {
    await Promise.all(pairs.map(([k, v]) => storageAny.setItem(k, v)));
  };

  storageAny.multiRemove = async (keys: readonly string[]): Promise<void> => {
    await Promise.all(keys.map((k) => storageAny.removeItem(k)));
  };

  storageAny.__taResilientPatched = true;
}

installResilientStorage();
