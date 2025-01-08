// Types to match Chrome's storage API
type StorageValue = string | number | boolean | null | undefined | StorageValue[] | { [key: string]: StorageValue };
type StorageArea = {
    get(keys?: string | string[] | Record<string, StorageValue>): Promise<Record<string, StorageValue>>;
    set(items: Record<string, StorageValue>): Promise<void>;
};

// Mock storage for development
const mockStorage = {
    data: new Map<string, StorageValue>(),

    get: async (keys?: string | string[] | Record<string, StorageValue>) => {
        console.log('Mock storage get:', keys);

        // If no keys, return all data
        if (!keys) {
            return Object.fromEntries(mockStorage.data.entries());
        }

        // Handle different types of keys parameter
        if (typeof keys === 'string') {
            return { [keys]: mockStorage.data.get(keys) };
        }

        if (Array.isArray(keys)) {
            return keys.reduce((acc, key) => {
                acc[key] = mockStorage.data.get(key);
                return acc;
            }, {} as Record<string, StorageValue>);
        }

        // Handle object with default values
        return Object.keys(keys).reduce((acc, key) => {
            const value = mockStorage.data.get(key);
            acc[key] = value !== undefined ? value : keys[key];
            return acc;
        }, {} as Record<string, StorageValue>);
    },

    set: async (items: Record<string, StorageValue>) => {
        console.log('Mock storage set:', items);
        Object.entries(items).forEach(([key, value]) => {
            mockStorage.data.set(key, value);
        });
    }
};

// Helper to determine if we're in extension context
const isExtensionContext = () => {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
};

// Storage interface that matches Chrome's storage.sync API
export const storage: StorageArea = {
    get: async (keys?: string | string[] | Record<string, StorageValue>) => {
        if (isExtensionContext()) {
            return chrome.storage.sync.get(keys);
        }
        return mockStorage.get(keys);
    },

    set: async (items: Record<string, StorageValue>) => {
        if (isExtensionContext()) {
            return chrome.storage.sync.set(items);
        }
        return mockStorage.set(items);
    }
};