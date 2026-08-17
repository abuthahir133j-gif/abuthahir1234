/**
 * Travel AI Buddy — Step 6: Travel Data Cache & In-Flight Request Deduplicator
 * 
 * Provides memory caching with TTL expiration and concurrent request deduplication
 * to avoid duplicate API requests across UI components.
 */
(function (global) {
    class TravelDataCache {
        constructor(defaultTtlMs = 120000) { // default 2 min TTL
            this.cache = new Map();
            this.inFlightRequests = new Map();
            this.defaultTtlMs = defaultTtlMs;
        }

        get(key) {
            const entry = this.cache.get(key);
            if (!entry) return null;

            if (Date.now() > entry.expiresAt) {
                this.cache.delete(key);
                return null;
            }

            return entry.data;
        }

        set(key, data, ttlMs = this.defaultTtlMs) {
            this.cache.set(key, {
                data,
                expiresAt: Date.now() + ttlMs
            });
        }

        /**
         * Execute a fetcher function with active request deduplication and caching
         * @param {string} key 
         * @param {Function} fetcher () => Promise<any>
         * @param {number} [ttlMs] 
         * @returns {Promise<any>}
         */
        async fetchCached(key, fetcher, ttlMs = this.defaultTtlMs) {
            // 1. Check valid cache
            const cached = this.get(key);
            if (cached !== null) {
                return cached;
            }

            // 2. Check in-flight active request (deduplication)
            if (this.inFlightRequests.has(key)) {
                return await this.inFlightRequests.get(key);
            }

            // 3. Initiate new request
            const promise = (async () => {
                try {
                    const result = await fetcher();
                    this.set(key, result, ttlMs);
                    return result;
                } finally {
                    this.inFlightRequests.delete(key);
                }
            })();

            this.inFlightRequests.set(key, promise);
            return await promise;
        }

        clear() {
            this.cache.clear();
            this.inFlightRequests.clear();
        }
    }

    const travelCache = new TravelDataCache();

    global.TravelDataCache = TravelDataCache;
    global.travelCache = travelCache;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TravelDataCache, travelCache };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
