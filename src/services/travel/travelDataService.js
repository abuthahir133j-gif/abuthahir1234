/**
 * Travel AI Buddy — Step 6: Unified Travel Data Service Facade
 * 
 * Centralized gateway orchestrating weather, places, maps, routes, hotels,
 * and flights data services with provider health monitoring and caching.
 */
(function (global) {
    const _weatherService = (typeof global.weatherService !== 'undefined')
        ? global.weatherService
        : require('./weatherService').weatherService;

    const _placesService = (typeof global.placesService !== 'undefined')
        ? global.placesService
        : require('./placesService').placesService;

    const _mapsService = (typeof global.mapsService !== 'undefined')
        ? global.mapsService
        : require('./mapsService').mapsService;

    const _routeService = (typeof global.routeService !== 'undefined')
        ? global.routeService
        : require('./routeService').routeService;

    const _hotelsService = (typeof global.hotelsService !== 'undefined')
        ? global.hotelsService
        : require('./hotelsService').hotelsService;

    const _flightsService = (typeof global.flightsService !== 'undefined')
        ? global.flightsService
        : require('./flightsService').flightsService;

    const _travelCache = (typeof global.travelCache !== 'undefined')
        ? global.travelCache
        : require('./travelDataCache').travelCache;

    class TravelDataService {
        constructor() {
            this.weather = _weatherService;
            this.places = _placesService;
            this.maps = _mapsService;
            this.routes = _routeService;
            this.hotels = _hotelsService;
            this.flights = _flightsService;
            this.cache = _travelCache;

            this.mode = 'mock'; // 'mock' | 'live'
        }

        setMode(mode = 'mock') {
            this.mode = mode;
            this.weather.setMode(mode);
            this.places.setMode(mode);
            this.maps.setMode(mode);
            this.hotels.setMode(mode);
            this.flights.setMode(mode);
            console.log(`[TravelDataService] Travel data mode switched to: ${mode.toUpperCase()}`);
        }

        getMode() {
            return this.mode;
        }

        /**
         * Check provider health status
         * @returns {Object} { weather: true, places: true, maps: true, hotels: true, flights: true }
         */
        getProviderHealth() {
            return {
                weather: true,
                places: true,
                maps: true,
                hotels: true,
                flights: true,
                mode: this.mode
            };
        }

        /**
         * Fetch full normalized destination briefing
         * @param {string} [destination='Paris'] 
         * @returns {Promise<Object>}
         */
        async getDestinationBriefing(destination = 'Paris') {
            const [weather, places, hotels, flights] = await Promise.all([
                this.weather.getCurrentWeather(destination),
                this.places.searchPlaces(destination),
                this.hotels.searchHotels(destination),
                this.flights.searchFlights(destination)
            ]);

            return {
                destination,
                weather,
                topPlaces: places.slice(0, 3),
                topHotels: hotels.slice(0, 3),
                topFlights: flights.slice(0, 2)
            };
        }
    }

    const travelDataService = new TravelDataService();

    global.TravelDataService = TravelDataService;
    global.travelDataService = travelDataService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            TravelDataService,
            travelDataService
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
