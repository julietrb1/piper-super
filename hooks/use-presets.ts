import { useEffect, useState } from "react";
import { BasicWeight } from "@/lib/basic-weight";

export interface WeightPreset {
  id?: number;
  presetName: string;
  weight: number;
  rearPassW: number;
  baggageW: number;
}

export interface AircraftPreset extends BasicWeight {
  id?: number;
  presetName?: string;
}

export const DB_NAME = "piper-super";
export const DB_VERSION = 4;
export const WEIGHT_STORE_NAME = "weight-presets";
export const AIRCRAFT_STORE_NAME = "aircraft-presets";

// Default presets to initialize the DB
export const defaultAircraftPresets = [
  {
    aircraft: "FTQ",
    subtype: "warrior3",
    weightLbs: 1478,
    armIn: 86.9,
  },
  {
    aircraft: "LXJ",
    subtype: "warrior3",
    weightLbs: 1571,
    armIn: 86.5,
  },
  {
    aircraft: "LXQ",
    subtype: "warrior3",
    weightLbs: 1573,
    armIn: 86.7,
  },
  {
    aircraft: "TAJ",
    subtype: "warrior3",
    weightLbs: 1578,
    armIn: 86.1,
  },
  {
    aircraft: "TXU",
    subtype: "warrior3",
    weightLbs: 1570,
    armIn: 86.2,
  },
  {
    aircraft: "VPN",
    subtype: "warrior3",
    weightLbs: 1570,
    armIn: 86.7,
  },
  {
    aircraft: "VPU",
    subtype: "warrior3",
    weightLbs: 1529,
    armIn: 86.0,
  },
  {
    aircraft: "VPF",
    subtype: "arrow3",
    weightLbs: 1821,
    armIn: 86.5,
  },
  {
    aircraft: "FTH",
    subtype: "arrow3",
    weightLbs: 1740,
    armIn: 86.3,
  },
];

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
      const openDbRequest = event.target as IDBOpenDBRequest;
      if (openDbRequest.result == null || openDbRequest.transaction == null) {
        reject("Database upgrade failed");
        return;
      }
      const db = openDbRequest.result;

      // Create weight presets store if it doesn't exist
      if (!db.objectStoreNames.contains(WEIGHT_STORE_NAME)) {
        const store = db.createObjectStore(WEIGHT_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("presetName", "presetName", { unique: true });
      }

      // Create aircraft presets store if it doesn't exist
      let aircraftStore;
      if (!db.objectStoreNames.contains(AIRCRAFT_STORE_NAME)) {
        aircraftStore = db.createObjectStore(AIRCRAFT_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        aircraftStore.createIndex("aircraft", "aircraft", { unique: true });
        aircraftStore.createIndex("subtype", "subtype", { unique: false });
      } else {
        aircraftStore =
          openDbRequest.transaction.objectStore(AIRCRAFT_STORE_NAME);

        // For version 3, add subtype index and remove presetName index
        if (event.oldVersion < 3) {
          // Check if presetName index exists and delete it
          if (aircraftStore.indexNames.contains("presetName")) {
            aircraftStore.deleteIndex("presetName");
          }

          // Add subtype index if it doesn't exist
          if (!aircraftStore.indexNames.contains("subtype")) {
            aircraftStore.createIndex("subtype", "subtype", { unique: false });
          }
        }
      }

      // For version 4, seed default aircraft presets
      if (event.oldVersion < 4) {
        // Only seed if we have access to the aircraft store
        if (aircraftStore) {
          console.log(
            "Seeding default aircraft presets during database upgrade",
          );

          // Get all existing aircraft to avoid duplicates
          const getAllRequest = aircraftStore.getAll();

          getAllRequest.onsuccess = () => {
            const existingPresets = getAllRequest.result || [];
            const existingAircraftCallsigns = new Set(
              existingPresets.map((p) => p.aircraft),
            );

            // Add default presets that don't already exist
            for (const preset of defaultAircraftPresets) {
              if (!existingAircraftCallsigns.has(preset.aircraft)) {
                try {
                  aircraftStore.add(preset);
                  existingAircraftCallsigns.add(preset.aircraft);
                } catch (error) {
                  console.warn(
                    `Error adding preset for ${preset.aircraft} during DB upgrade:`,
                    error,
                  );
                }
              }
            }
          };
        }
      }
    };
  });
};

// Generic DB operations for both types of presets
export const createPresetDB = <T extends { id?: number }>(
  storeName: string,
) => ({
  async getAll(): Promise<T[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(`Error getting presets from ${storeName}: ${request.error}`);
      };
    });
  },

  async create(preset: Omit<T, "id">): Promise<T> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(preset);

      request.onsuccess = () => {
        const id = request.result as number;
        resolve({ ...preset, id } as T);
      };

      request.onerror = () => {
        reject(`Error creating preset in ${storeName}: ${request.error}`);
      };
    });
  },

  async update(preset: T): Promise<T> {
    if (preset.id == null) {
      throw new Error("Cannot update preset without an ID");
    }

    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(preset);

      request.onsuccess = () => {
        resolve(preset);
      };

      request.onerror = () => {
        reject(`Error updating preset in ${storeName}: ${request.error}`);
      };
    });
  },

  async delete(preset: T): Promise<void> {
    if (preset.id == null) {
      throw new Error("Cannot delete preset without an ID");
    }

    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(preset.id!);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(`Error deleting preset from ${storeName}: ${request.error}`);
      };
    });
  },
});

// Create specific DB instances for each store
export const weightPresetDB = createPresetDB<WeightPreset>(WEIGHT_STORE_NAME);
export const aircraftPresetDB =
  createPresetDB<AircraftPreset>(AIRCRAFT_STORE_NAME);

// Generic hook creator for presets
export function createPresetsHook<T extends { id?: number }>(
  db: ReturnType<typeof createPresetDB<T>>,
  presetType: string,
) {
  return function usePresets() {
    const [presets, setPresets] = useState<T[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Function to load presets
    const loadPresets = async () => {
      try {
        const fetchedPresets = await db.getAll();
        setPresets(
          [...fetchedPresets].sort((a: unknown, b: unknown) => {
            // For weight presets, sort by presetName
            if (
              (a as WeightPreset).presetName &&
              (b as WeightPreset).presetName
            ) {
              return (a as WeightPreset).presetName.localeCompare(
                (b as WeightPreset).presetName,
              );
            }
            // For aircraft presets, sort by aircraft
            if (
              (a as AircraftPreset).aircraft &&
              (b as AircraftPreset).aircraft
            ) {
              return (a as AircraftPreset).aircraft.localeCompare(
                (b as AircraftPreset).aircraft,
              );
            }
            return 0;
          }),
        );
        setIsSubscribed(true);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setError(`Error fetching ${presetType} presets: ${err}`);
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

      window.addEventListener("storage", handleStorageChange);

      return () => {
        setIsSubscribed(false);
        window.removeEventListener("storage", handleStorageChange);
      };
    }, []);

    return {
      presets,
      isLoading,
      error,
      isSubscribed,
      refreshPresets: loadPresets,
    };
  };
}

// Create specific hooks for each type of preset
export const useWeightPresetsBase = createPresetsHook<WeightPreset>(
  weightPresetDB,
  "weight",
);

export const useAircraftPresets = createPresetsHook<AircraftPreset>(
  aircraftPresetDB,
  "aircraft",
);

// Wrapper for backward compatibility
export function useWeightPresets() {
  const { presets, isLoading, error, isSubscribed, refreshPresets } =
    useWeightPresetsBase();

  return {
    weightPresets: presets,
    isLoading,
    error,
    isSubscribed,
    refreshPresets,
  };
}
