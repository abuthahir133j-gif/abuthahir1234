/**
 * Travel AI Buddy — Step 6: Maps & Route Service
 * 
 * Provider-independent maps service for route calculation and distance estimation.
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

    class MapsService {
        constructor(cache = _travelCache) {
            this.cache = cache;
            this.mode = 'mock';
            this.endpoint = '/api/travel/routes';
        }

        setMode(mode = 'mock') {
            this.mode = mode;
        }

        /**
         * Get route between two locations
         * @param {string} origin 
         * @param {string} destination 
         * @param {string} [travelMode='walking']
         * @returns {Promise<Object>} Normalized Route Object
         */
        async getRoute(origin = 'Eiffel Tower', destination = 'Louvre Museum', travelMode = 'walking') {
            const routeKey = `${origin}::${destination}`;
            const cacheKey = `route::${routeKey}::${travelMode}`;

            return await this.cache.fetchCached(cacheKey, async () => {
                if (this.mode === 'live' && typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
                    try {
                        const res = await fetch(`${this.endpoint}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${encodeURIComponent(travelMode)}`, {
                            signal: AbortSignal.timeout(3000)
                        });
                        if (res.ok) {
                            const raw = await res.json();
                            return _TravelDataNormalizer.normalizeRoute(raw);
                        }
                    } catch (e) {
                        console.warn('[MapsService] Live route query failed, using mock data:', e.message);
                    }
                }

                // Mock Route Provider
                const mockRoutes = _TRAVEL_MOCK_DATA.destinations.Paris.routes;
                const match = mockRoutes[routeKey] || {
                    origin,
                    destination,
                    distanceMeters: 2500,
                    durationSeconds: 1500, // 25 mins
                    mode: travelMode,
                    traffic: 'normal'
                };

                return _TravelDataNormalizer.normalizeRoute(match);
            }, 300000); // 5 min TTL
        }

        /**
         * Get distance in meters/km
         */
        async getDistance(origin, destination) {
            const route = await this.getRoute(origin, destination);
            return {
                distanceMeters: route.distanceMeters,
                distanceKm: route.distanceKm,
                durationMinutes: route.durationMinutes
            };
        }
    }

    const mapsService = new MapsService();

    global.MapsService = MapsService;
    global.mapsService = mapsService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MapsService, mapsService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
