import { useEffect, useState } from "react";

export interface WeightPreset {
  id?: number;
  presetName: string;
  weight: number;
}

const DB_NAME = 'weight-presets-db';
const DB_VERSION = 1;
const STORE_NAME = 'weight-presets';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('presetName', 'presetName', { unique: true });
      }
    };
  });
};

export const weightPresetDB = {
  async getAll(): Promise<WeightPreset[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(`Error getting weight presets: ${request.error}`);
      };
    });
  },

  async create(preset: Omit<WeightPreset, 'id'>): Promise<WeightPreset> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(preset);

      request.onsuccess = () => {
        const id = request.result as number;
        resolve({ ...preset, id });
      };

      request.onerror = () => {
        reject(`Error creating weight preset: ${request.error}`);
      };
    });
  },

  async delete(preset: WeightPreset): Promise<void> {
    if (preset.id == null) {
      throw new Error('Cannot delete preset without an ID');
    }

    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(preset.id!);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(`Error deleting weight preset: ${request.error}`);
      };
    });
  }
};

export function useWeightPresets() {
  const [weightPresets, setWeightPresets] = useState<WeightPreset[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load presets
  const loadPresets = async () => {
    try {
      const presets = await weightPresetDB.getAll();
      setWeightPresets(
        [...presets].sort((a, b) => a.presetName.localeCompare(b.presetName))
      );
      setIsSubscribed(true);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError(`Error fetching weight presets: ${err}`);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DB_NAME) {
        loadPresets();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      setIsSubscribed(false);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { weightPresets, isLoading, error, isSubscribed };
}
