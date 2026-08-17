/**
 * Travel AI Buddy — Step 6: Route & Travel-Time Intelligence Service
 * 
 * Compares scheduled activities against estimated travel durations to detect
 * tight transfers and feasibility gaps.
 */
(function (global) {
    const _mapsService = (typeof global.mapsService !== 'undefined')
        ? global.mapsService
        : require('./mapsService').mapsService;

    class RouteService {
        constructor(maps = _mapsService) {
            this.maps = maps;
        }

        /**
         * Analyze feasibility between two scheduled activities
         * @param {Object} act1 { time: '09:00', place: 'Eiffel Tower', durationMins: 90 }
         * @param {Object} act2 { time: '10:00', place: 'Louvre Museum' }
         * @returns {Promise<Object>} Analysis of transfer tightness
         */
        async analyzeTransferFeasibility(act1, act2) {
            if (!act1 || !act2 || !act1.time || !act2.time) {
                return { isFeasible: true, reason: 'Missing time data' };
            }

            const [h1, m1] = act1.time.split(':').map(Number);
            const [h2, m2] = act2.time.split(':').map(Number);
            const t1 = h1 * 60 + (m1 || 0);
            const t2 = h2 * 60 + (m2 || 0);

            const scheduledGapMins = t2 - t1;
            const place1 = act1.place || act1.name || 'Activity 1';
            const place2 = act2.place || act2.name || 'Activity 2';

            const route = await this.maps.getRoute(place1, place2);
            const travelDurationMins = route.durationMinutes;

            // Feasibility check: scheduled gap should allow both activity duration and travel time
            const requiredBuffer = (act1.durationMins || 60) + travelDurationMins;
            const isTight = scheduledGapMins < requiredBuffer;

            return {
                origin: place1,
                destination: place2,
                scheduledGapMinutes: scheduledGapMins,
                travelDurationMinutes: travelDurationMins,
                distanceKm: route.distanceKm,
                isTightTransfer: isTight,
                warning: isTight ? `Only ${scheduledGapMins}m scheduled, but ${travelDurationMins}m travel time required.` : null
            };
        }
    }

    const routeService = new RouteService();

    global.RouteService = RouteService;
    global.routeService = routeService;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { RouteService, routeService };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
