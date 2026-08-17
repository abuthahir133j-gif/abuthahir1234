/**
 * Travel AI Buddy — Step 6: Hotels Service
 * 
 * Provider-independent hotel service for price comparison and budget-conscious recommendations.
 */
(function (global) {
    const _travelCache = (typeof global.travelCache !== 'undefined')
        ? global.travelCache
        : require('./travelDataCache').travelCache;

    const _TravelDataNormalizer = (typeof global.TravelDataNormalizer !== 'undefined')
        ? global.TravelDataNormalizer
        : require('./travelDataNormalizer').TravelDataNormalizer;

    const _TRAVEL_MOCK_DATA = (typeof global.TRAVEL_MOCK_DATA !== 'undefined')
        ? global.TRAVEL_MOCK_DATA
        : require('./mock/travelMockData').TRAVEL_MOCK_DATA;

    class HotelsService {
        constructor(cache = _travelCache) {
            this.cache = cache;
            this.mode = 'mock';
            this.endpoint = '/api/travel/hotels';
        }

        setMode(mode = 'mock') {
            this.mode = mode;
        }

        /**
         * Search available hotels in destination
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Array<Object>>} Normalized Hotels
         */
        async searchHotels(destination = 'Paris') {
            const cacheKey = `hotels::${destination}`;

            return await this.cache.fetchCached(cacheKey, async () => {
                if (this.mode === 'live' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
                    try {
                        const res = await fetch(`${this.endpoint}?destination=${encodeURIComponent(destination)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (res.ok) {
                            const rawList = await res.json();
                            return (Array.isArray(rawList) ? rawList : []).map(h => _TravelDataNormalizer.normalizeHotel(h));
                        }
                    } catch (e) {
                        console.warn('[HotelsService] Live query failed, using mock data:', e.message);
                    }
                }

                const mockDest = _TRAVEL_MOCK_DATA.destinations[destination] || _TRAVEL_MOCK_DATA.destinations.Paris;
                return (mockDest.hotels || []).map(h => _TravelDataNormalizer.normalizeHotel(h));
            }, 180000);
        }

        /**
         * Find a cheaper alternative hotel that fits within budget
         * @param {Object|string} currentHotel 
         * @param {string} [destination='Paris'] 
         * @param {number} [remainingBudget] 
         * @returns {Promise<Object|null>} Better hotel option
         */
        async findBetterHotelOption(currentHotel, destination = 'Paris', remainingBudget = null) {
            const hotels = await this.searchHotels(destination);
            const currentPrice = typeof currentHotel === 'number'
                ? currentHotel
                : (currentHotel?.price || currentHotel?.pricePerNight || 85000);

            // Find a hotel that is cheaper and has good rating (>= 4.3)
            const betterOption = hotels.find(h => {
                const isCheaper = h.pricePerNight < currentPrice;
                const fitsBudget = remainingBudget !== null ? h.pricePerNight <= remainingBudget : true;
                return isCheaper && fitsBudget && h.rating >= 4.3;
            });

            return betterOption || null;
        }
    }

    const hotelsService = new HotelsService();

    global.HotelsService = HotelsService;
    global.hotelsService = hotelsService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { HotelsService, hotelsService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
