/**
 * Travel AI Buddy — Step 6: Flights Service
 * 
 * Provider-independent flights service with price drop detection and deal matching.
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

    class FlightsService {
        constructor(cache = _travelCache) {
            this.cache = cache;
            this.mode = 'mock';
            this.endpoint = '/api/travel/flights';
        }

        setMode(mode = 'mock') {
            this.mode = mode;
        }

        /**
         * Search flights for a destination
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Array<Object>>} Normalized Flights List
         */
        async searchFlights(destination = 'Paris') {
            const cacheKey = `flights::${destination}`;

            return await this.cache.fetchCached(cacheKey, async () => {
                if (this.mode === 'live' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
                    try {
                        const res = await fetch(`${this.endpoint}?destination=${encodeURIComponent(destination)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (res.ok) {
                            const rawList = await res.json();
                            return (Array.isArray(rawList) ? rawList : []).map(f => _TravelDataNormalizer.normalizeFlight(f));
                        }
                    } catch (e) {
                        console.warn('[FlightsService] Live flight query failed, using mock data:', e.message);
                    }
                }

                const mockDest = _TRAVEL_MOCK_DATA.destinations[destination] || _TRAVEL_MOCK_DATA.destinations.Paris;
                return (mockDest.flights || []).map(f => _TravelDataNormalizer.normalizeFlight(f));
            }, 180000);
        }

        /**
         * Detect if any flight has a meaningful price drop (> ₹5,000)
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Object|null>}
         */
        async detectFlightPriceDrop(destination = 'Paris') {
            const flights = await this.searchFlights(destination);
            return flights.find(f => f.isBetterDeal === true || f.priceDrop >= 5000) || null;
        }
    }

    const flightsService = new FlightsService();

    global.FlightsService = FlightsService;
    global.flightsService = flightsService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { FlightsService, flightsService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
