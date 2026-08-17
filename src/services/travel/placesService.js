/**
 * Travel AI Buddy — Step 6: Places Service
 * 
 * Provider-independent places service for landmarks, museums, parks,
 * and opening hours intelligence.
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

    class PlacesService {
        constructor(cache = _travelCache) {
            this.cache = cache;
            this.mode = 'mock';
            this.endpoint = '/api/travel/places';
        }

        setMode(mode = 'mock') {
            this.mode = mode;
        }

        /**
         * Search places in a destination
         * @param {string} [destination='Paris'] 
         * @param {string} [category] ('museum'|'park'|'landmark'|'all')
         * @returns {Promise<Array<Object>>} Normalized Places List
         */
        async searchPlaces(destination = 'Paris', category = 'all') {
            const cacheKey = `places::${destination}::${category}`;

            return await this.cache.fetchCached(cacheKey, async () => {
                if (this.mode === 'live' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
                    try {
                        const res = await fetch(`${this.endpoint}?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (res.ok) {
                            const rawList = await res.json();
                            return (Array.isArray(rawList) ? rawList : []).map(p => _TravelDataNormalizer.normalizePlace(p));
                        }
                    } catch (e) {
                        console.warn('[PlacesService] Live query failed, using mock data:', e.message);
                    }
                }

                const mockDest = _TRAVEL_MOCK_DATA.destinations[destination] || _TRAVEL_MOCK_DATA.destinations.Paris;
                let places = mockDest.places || [];

                if (category && category !== 'all') {
                    places = places.filter(p => p.category === category.toLowerCase());
                }

                return places.map(p => _TravelDataNormalizer.normalizePlace(p));
            }, 180000); // 3 min TTL
        }

        /**
         * Get place details by place ID
         * @param {string} placeId 
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Object|null>}
         */
        async getPlaceDetails(placeId, destination = 'Paris') {
            const allPlaces = await this.searchPlaces(destination);
            return allPlaces.find(p => p.id === placeId || p.name.toLowerCase().includes(placeId.toLowerCase())) || null;
        }

        /**
         * Find places that are closing soon
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Array<Object>>}
         */
        async getClosingSoonPlaces(destination = 'Paris') {
            const places = await this.searchPlaces(destination);
            return places.filter(p => p.openingHours?.closesSoon === true);
        }
    }

    const placesService = new PlacesService();

    global.PlacesService = PlacesService;
    global.placesService = placesService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { PlacesService, placesService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
