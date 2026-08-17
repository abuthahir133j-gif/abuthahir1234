/**
 * Travel AI Buddy — Travel Data Services Exports
 */

const { travelCache, TravelDataCache } = require('./travelDataCache');
const { TravelDataNormalizer } = require('./travelDataNormalizer');
const { TRAVEL_MOCK_DATA } = require('./mock/travelMockData');
const { weatherService, WeatherService } = require('./weatherService');
const { placesService, PlacesService } = require('./placesService');
const { mapsService, MapsService } = require('./mapsService');
const { routeService, RouteService } = require('./routeService');
const { hotelsService, HotelsService } = require('./hotelsService');
const { flightsService, FlightsService } = require('./flightsService');
const { travelDataService, TravelDataService } = require('./travelDataService');

module.exports = {
    travelCache,
    TravelDataCache,
    TravelDataNormalizer,
    TRAVEL_MOCK_DATA,
    weatherService,
    WeatherService,
    placesService,
    PlacesService,
    mapsService,
    MapsService,
    routeService,
    RouteService,
    hotelsService,
    HotelsService,
    flightsService,
    FlightsService,
    travelDataService,
    TravelDataService
};
