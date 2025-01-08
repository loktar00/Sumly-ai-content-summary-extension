// Types to match Chrome's storage API
type StorageValue = string | number | boolean | null | undefined | StorageValue[] | { [key: string]: StorageValue };
type StorageChange = {
    oldValue?: StorageValue;
    newValue?: StorageValue;
};
type StorageChangeEvent = {
    changes: { [key: string]: StorageChange };
    areaName: 'sync' | 'local' | 'managed' | 'session';
};

// Storage area interface matching Chrome's API
interface StorageArea {
    get(keys?: string | string[] | Record<string, StorageValue>): Promise<Record<string, StorageValue>>;
    set(items: Record<string, StorageValue>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
    getBytesInUse?(keys?: string | string[]): Promise<number>;
}

// Mock storage implementation
class MockStorageArea implements StorageArea {
    private data: Map<string, StorageValue> = new Map();
    private listeners: ((changes: StorageChangeEvent) => void)[] = [];
    private areaName: 'sync' | 'local' | 'managed' | 'session';
    private quotaBytes: number;

    constructor(areaName: 'sync' | 'local' | 'managed' | 'session', quotaBytes: number) {
        this.areaName = areaName;
        this.quotaBytes = quotaBytes;

        // Load persisted data from localStorage
        const storedData = localStorage.getItem(`chrome.storage.${areaName}`);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData) as Record<string, StorageValue>;
                Object.entries(parsed).forEach(([key, value]) => {
                    this.data.set(key, value);
                });
            } catch (e) {
                console.error(`Error loading ${areaName} storage data:`, e);
            }
        }
    }

    private persistData(): void {
        const dataObj = Object.fromEntries(this.data.entries());
        localStorage.setItem(`chrome.storage.${this.areaName}`, JSON.stringify(dataObj));
    }

    private notifyListeners(changes: Record<string, StorageChange>): void {
        const event: StorageChangeEvent = {
            changes,
            areaName: this.areaName
        };
        this.listeners.forEach(listener => listener(event));
    }

    async get(keys?: string | string[] | Record<string, StorageValue>): Promise<Record<string, StorageValue>> {
        console.log(`Mock ${this.areaName} storage get:`, keys);

        if (!keys) {
            return Object.fromEntries(this.data.entries());
        }

        if (typeof keys === 'string') {
            return { [keys]: this.data.get(keys) };
        }

        if (Array.isArray(keys)) {
            return keys.reduce((acc, key) => {
                acc[key] = this.data.get(key);
                return acc;
            }, {} as Record<string, StorageValue>);
        }

        return Object.keys(keys).reduce((acc, key) => {
            acc[key] = this.data.has(key) ? this.data.get(key) : keys[key];
            return acc;
        }, {} as Record<string, StorageValue>);
    }

    async set(items: Record<string, StorageValue>): Promise<void> {
        console.log(`Mock ${this.areaName} storage set:`, items);

        const changes: Record<string, StorageChange> = {};

        Object.entries(items).forEach(([key, value]) => {
            const oldValue = this.data.get(key);
            if (oldValue !== value) {
                changes[key] = { oldValue, newValue: value };
                this.data.set(key, value);
            }
        });

        if (Object.keys(changes).length > 0) {
            this.persistData();
            this.notifyListeners(changes);
        }
    }

    async remove(keys: string | string[]): Promise<void> {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        const changes: Record<string, StorageChange> = {};

        keysArray.forEach(key => {
            if (this.data.has(key)) {
                changes[key] = { oldValue: this.data.get(key) };
                this.data.delete(key);
            }
        });

        if (Object.keys(changes).length > 0) {
            this.persistData();
            this.notifyListeners(changes);
        }
    }

    async clear(): Promise<void> {
        const changes: Record<string, StorageChange> = {};
        this.data.forEach((value, key) => {
            changes[key] = { oldValue: value };
        });

        this.data.clear();
        this.persistData();
        this.notifyListeners(changes);
    }

    addListener(callback: (event: StorageChangeEvent) => void): void {
        this.listeners.push(callback);
    }

    removeListener(callback: (event: StorageChangeEvent) => void): void {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
}

// Create mock storage areas with appropriate quota limits
const mockLocal = new MockStorageArea('local', 10485760);  // 10MB
const mockSync = new MockStorageArea('sync', 102400);      // 100KB
const mockSession = new MockStorageArea('session', 10485760); // 10MB
const mockManaged = new MockStorageArea('managed', 10485760); // 10MB

// Create the mock chrome.storage API
const mockChromeStorage = {
    local: mockLocal,
    sync: mockSync,
    session: mockSession,
    managed: mockManaged,
    onChanged: {
        addListener: (callback: (changes: Record<string, StorageChange>, areaName: string) => void) => {
            [mockLocal, mockSync, mockSession, mockManaged].forEach(area => {
                area.addListener((event) => callback(event.changes, event.areaName));
            });
        },
        removeListener: (callback: (changes: Record<string, StorageChange>, areaName: string) => void) => {
            [mockLocal, mockSync, mockSession, mockManaged].forEach(area => {
                area.removeListener((event) => callback(event.changes, event.areaName));
            });
        }
    }
};

// Helper to determine if we're in extension context
const isExtensionContext = () => {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
};

// Export the storage interface
export const storage = isExtensionContext() ? chrome.storage : mockChromeStorage;