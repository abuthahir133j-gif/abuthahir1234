/**
 * Travel AI Buddy — Step 6: Weather Service
 * 
 * Provider-independent weather service with caching, normalization, and mock fallback.
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

    class WeatherService {
        constructor(cache = _travelCache) {
            this.cache = cache;
            this.mode = 'mock'; // 'mock' | 'live'
            this.endpoint = '/api/travel/weather';
        }

        setMode(mode = 'mock') {
            this.mode = mode;
        }

        /**
         * Fetch current weather for a destination/location
         * @param {string} destination 
         * @param {boolean} [forceRain=false] (for testing rain scenarios)
         * @returns {Promise<Object>} Normalized Weather Object
         */
        async getCurrentWeather(destination = 'Paris', forceRain = false) {
            const cacheKey = `weather::${destination}::${forceRain}`;

            return await this.cache.fetchCached(cacheKey, async () => {
                if (this.mode === 'live' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
                    try {
                        const res = await fetch(`${this.endpoint}?destination=${encodeURIComponent(destination)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (res.ok) {
                            const raw = await res.json();
                            return _TravelDataNormalizer.normalizeWeather(raw, destination);
                        }
                    } catch (e) {
                        console.warn('[WeatherService] Live API query failed, falling back to mock:', e.message);
                    }
                }

                // Mock Data Provider
                const mockDest = _TRAVEL_MOCK_DATA.destinations[destination] || _TRAVEL_MOCK_DATA.destinations.Paris;
                const rawWeather = forceRain ? mockDest.rainWeather : mockDest.weather;
                return _TravelDataNormalizer.normalizeWeather(rawWeather, destination);
            }, 60000); // 1 min TTL
        }
    }

    const weatherService = new WeatherService();

    global.WeatherService = WeatherService;
    global.weatherService = weatherService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { WeatherService, weatherService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
