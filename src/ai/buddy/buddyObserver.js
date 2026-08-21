
/**
 * Travel AI Buddy — Step 4: Proactive Observation Engine
 * 
 * Inspects travel context and incoming application events to detect proactive
 * observations (e.g. over-budget hotels, weather vs outdoor itinerary conflicts,
 * schedule timing overlaps, arrivals, and budget thresholds).
 */
(function (global) {
    const _buddyContext = (typeof global.buddyContext !== 'undefined')
        ? global.buddyContext
        : require('./buddyContext').buddyContext;

    const OBSERVATION_TYPES = {
        HOTEL_OVER_BUDGET: 'HOTEL_OVER_BUDGET',
        BETTER_HOTEL_OPTION: 'BETTER_HOTEL_OPTION',
        CHEAPER_FLIGHT_FOUND: 'CHEAPER_FLIGHT_FOUND',
        PLACE_CLOSING_SOON: 'PLACE_CLOSING_SOON',
        TIGHT_TRANSFER: 'TIGHT_TRANSFER',
        PREFERENCE_MATCH: 'PREFERENCE_MATCH',
        SAVED_PLACE_NEARBY: 'SAVED_PLACE_NEARBY',
        STYLE_MISMATCH_WARNING: 'STYLE_MISMATCH_WARNING',
        BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
        BUDGET_WARNING: 'BUDGET_WARNING',
        WEATHER_AFFECTS_ITINERARY: 'WEATHER_AFFECTS_ITINERARY',
        WEATHER_CHANGED: 'WEATHER_CHANGED',
        ITINERARY_CONFLICT: 'ITINERARY_CONFLICT',
        USER_ARRIVED: 'USER_ARRIVED',
        DESTINATION_SELECTED: 'DESTINATION_SELECTED',
        ITINERARY_COMPLETED: 'ITINERARY_COMPLETED',
        BOOKING_COMPLETED: 'BOOKING_COMPLETED',
        GENERAL_UPDATE: 'GENERAL_UPDATE'
    };

    class BuddyObservationEngine {
        constructor(context = _buddyContext) {
            this.context = context;
        }

        /**
         * Analyze an incoming event and current context to generate observations
         * @param {string} eventName 
         * @param {*} [eventData] 
         * @returns {Object|null} Observation object or null if no observation
         */
        detectObservation(eventName, eventData = null) {
            const ctx = this.context.get();

            // Explicit Observation Passing
            if (eventName === 'OBSERVATION_GENERATED' && eventData?.type) {
                return {
                    type: eventData.type,
                    severity: eventData.severity || 'important',
                    data: eventData.data || {}
                };
            }

            // 1. Hotel Over Budget or Better Hotel Option Detection
            if (eventName === 'HOTEL_SELECTED') {
                const hotelPrice = Number(eventData?.price || eventData?.cost || 0);
                const hotelName = typeof eventData === 'string' ? eventData : (eventData?.name || eventData?.hotelName || 'Selected Hotel');

                if (eventData?.isBetterDeal) {
                    return {
                        type: OBSERVATION_TYPES.BETTER_HOTEL_OPTION,
                        severity: 'important',
                        data: {
                            hotelName,
                            hotelPrice,
                            savings: eventData.savings || 5000
                        }
                    };
                }

                if (ctx.budget !== null && hotelPrice > 0) {
                    // Check if hotel causes total spend > budget or exceeds remaining budget
                    if (ctx.currentSpend > ctx.budget || (ctx.remainingBudget !== null && hotelPrice > ctx.remainingBudget)) {
                        return {
                            type: OBSERVATION_TYPES.HOTEL_OVER_BUDGET,
                            severity: 'important',
                            data: {
                                hotelName,
                                hotelPrice,
                                budget: ctx.budget,
                                currentSpend: ctx.currentSpend,
                                remainingBudget: ctx.remainingBudget
                            }
                        };
                    }
                }
            }

            // 1b. Flight Cheaper Deal Detection
            if (eventName === 'FLIGHT_SELECTED') {
                if (eventData?.isBetterDeal || (eventData?.priceDrop && eventData.priceDrop >= 2000)) {
                    return {
                        type: OBSERVATION_TYPES.CHEAPER_FLIGHT_FOUND,
                        severity: 'important',
                        data: {
                            airline: eventData.airline || 'Flight',
                            priceDrop: eventData.priceDrop || 10000,
                            newPrice: eventData.price
                        }
                    };
                }
            }

            // 1c. Place Closing Soon Detection
            if (eventName === 'PLACE_SELECTED') {
                if (eventData?.openingHours?.closesSoon || eventData?.closesSoon) {
                    const placeName = typeof eventData === 'string' ? eventData : (eventData?.name || 'Attraction');
                    return {
                        type: OBSERVATION_TYPES.PLACE_CLOSING_SOON,
                        severity: 'important',
                        data: {
                            placeName,
                            closesAt: eventData?.openingHours?.closesAt || '18:00'
                        }
                    };
                }
            }

            // 2. Direct Budget Exceeded Event
            if (eventName === 'BUDGET_EXCEEDED') {
                return {
                    type: OBSERVATION_TYPES.BUDGET_EXCEEDED,
                    severity: 'critical',
                    data: {
                        budget: ctx.budget,
                        currentSpend: ctx.currentSpend,
                        remainingBudget: ctx.remainingBudget
                    }
                };
            }

            // 3. 80% Budget Warning Threshold
            if (eventName === 'PLACE_SELECTED' || eventName === 'FLIGHT_SELECTED') {
                if (ctx.budget !== null && ctx.budget > 0) {
                    const ratio = ctx.currentSpend / ctx.budget;
                    if (ratio >= (ctx.budgetWarningThreshold || 0.8) && ratio <= 1.0) {
                        return {
                            type: OBSERVATION_TYPES.BUDGET_WARNING,
                            severity: 'important',
                            data: {
                                budget: ctx.budget,
                                currentSpend: ctx.currentSpend,
                                percentUsed: Math.round(ratio * 100)
                            }
                        };
                    }
                }
            }

            // 4. Weather Affects Outdoor Itinerary Detection (Proactive Scenario 2)
            if (eventName === 'WEATHER_CHANGED') {
                const isRainOrStorm = ctx.weather && (
                    ctx.weather.condition?.includes('rain') ||
                    ctx.weather.condition?.includes('storm') ||
                    ctx.weather.severity === 'warning'
                );

                if (isRainOrStorm && this.context.hasOutdoorActivities()) {
                    const outdoorAct = ctx.itinerary.find(item => item.isOutdoor !== false);
                    return {
                        type: OBSERVATION_TYPES.WEATHER_AFFECTS_ITINERARY,
                        severity: 'important',
                        data: {
                            condition: ctx.weather.condition,
                            temperature: ctx.weather.temperature,
                            activity: outdoorAct?.place || 'outdoor sight'
                        }
                    };
                }

                return {
                    type: OBSERVATION_TYPES.WEATHER_CHANGED,
                    severity: 'normal',
                    data: { condition: ctx.weather?.condition || 'sunny' }
                };
            }

            // 5. Itinerary Conflict Detection (Proactive Scenario 3)
            if (eventName === 'ITINERARY_UPDATED' || eventName === 'ITINERARY_CREATED') {
                const conflictAnalysis = this.context.detectItineraryConflicts();
                if (conflictAnalysis.hasConflict) {
                    return {
                        type: OBSERVATION_TYPES.ITINERARY_CONFLICT,
                        severity: 'important',
                        data: {
                            conflicts: conflictAnalysis.conflicts,
                            conflictCount: conflictAnalysis.conflicts.length
                        }
                    };
                }
            }

            // 6. User Arrived at Destination
            if (eventName === 'USER_ARRIVED' || eventName === 'LOCATION_CHANGED') {
                const locName = typeof eventData === 'string' ? eventData : (eventData?.name || ctx.destination || 'Destination');
                return {
                    type: OBSERVATION_TYPES.USER_ARRIVED,
                    severity: 'important',
                    data: { location: locName }
                };
            }

            // 7. Destination Selected
            if (eventName === 'DESTINATION_SELECTED') {
                const dest = typeof eventData === 'string' ? eventData : (eventData?.destination || eventData?.city || 'Paris');
                return {
                    type: OBSERVATION_TYPES.DESTINATION_SELECTED,
                    severity: 'important',
                    data: { destination: dest }
                };
            }

            // 8. Itinerary Completed
            if (eventName === 'ITINERARY_COMPLETED') {
                return {
                    type: OBSERVATION_TYPES.ITINERARY_COMPLETED,
                    severity: 'critical',
                    data: { destination: ctx.destination }
                };
            }

            // 9. Booking Completed
            if (eventName === 'BOOKING_COMPLETED') {
                return {
                    type: OBSERVATION_TYPES.BOOKING_COMPLETED,
                    severity: 'critical',
                    data: { destination: ctx.destination }
                };
            }

            return null;
        }
    }

    const buddyObserver = new BuddyObservationEngine();

    global.OBSERVATION_TYPES = OBSERVATION_TYPES;
    global.BuddyObservationEngine = BuddyObservationEngine;
    global.buddyObserver = buddyObserver;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            OBSERVATION_TYPES,
            BuddyObservationEngine,
            buddyObserver
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
