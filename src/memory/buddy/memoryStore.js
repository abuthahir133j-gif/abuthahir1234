/**
 * Travel AI Buddy — Step 7: Memory Storage Adapter
 * 
 * Storage abstraction supporting LocalStorage, Electron SQLite/fs fallback,
 * and memory store with JSON serialization.
 */
(function (global) {
    class MemoryStore {
        constructor(storageKeyPrefix = 'travel_buddy_') {
            this.prefix = storageKeyPrefix;
            this.inMemoryCache = new Map();
        }

        getKey(key) {
            return `${this.prefix}${key}`;
        }

        get(key, defaultValue = null) {
            const fullKey = this.getKey(key);
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const raw = window.localStorage.getItem(fullKey);
                    if (raw !== null) {
                        return JSON.parse(raw);
                    }
                }
            } catch (e) {}

            return this.inMemoryCache.has(fullKey) ? this.inMemoryCache.get(fullKey) : defaultValue;
        }

        set(key, value) {
            const fullKey = this.getKey(key);
            this.inMemoryCache.set(fullKey, value);

            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(fullKey, JSON.stringify(value));
                }
            } catch (e) {}
        }

        remove(key) {
            const fullKey = this.getKey(key);
            this.inMemoryCache.delete(fullKey);

            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(fullKey);
                }
            } catch (e) {}
        }

        clear() {
            this.inMemoryCache.clear();
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const keysToRemove = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith(this.prefix)) {
                            keysToRemove.push(k);
                        }
                    }
                    for (const k of keysToRemove) {
                        window.localStorage.removeItem(k);
                    }
                }
            } catch (e) {}
        }
    }

    const memoryStore = new MemoryStore();

    global.MemoryStore = MemoryStore;
    global.memoryStore = memoryStore;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MemoryStore, memoryStore };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
