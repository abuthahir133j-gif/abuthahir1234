/**
 * Travel AI Buddy — Step 4: Expanded Travel Context Store
 * 
 * Centralized, reactive state store maintaining full trip awareness:
 * destination, budget/spend tracking, itinerary activities & conflict detection,
 * weather status, location, map state, and proactive mode controls.
 */
(function (global) {
    class BuddyContext {
        constructor(initialContext = {}) {
            this.context = {
                destination: null,
                currentLocation: {
                    latitude: null,
                    longitude: null,
                    name: null
                },
                currentPage: null,
                currentAction: null,
                tripStartDate: null,
                tripEndDate: null,
                tripDuration: null,
                travelers: 1,

                // Budget Awareness
                budget: null,
                currentSpend: 0,
                remainingBudget: null,
                budgetWarningThreshold: 0.80, // 80% usage threshold

                // Travel Inventory & Itinerary
                selectedFlights: [],
                selectedHotels: [],
                selectedPlaces: [],
                itinerary: [], // [{ id, time: '09:00', place: 'Eiffel Tower', isOutdoor: true, durationMins: 120 }]

                // Environment & Temporal State
                weather: null, // { condition, temperature, precipitationProbability, severity, isOutdoorFriendly }
                timeOfDay: this.computeTimeOfDay(),
                localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mapState: null,

                // Proactive Companion Settings
                proactiveReactionsEnabled: true,

                ...initialContext
            };

            this.listeners = new Set();
            this.recalculateBudget();
        }

        get() {
            return {
                ...this.context,
                currentLocation: { ...this.context.currentLocation },
                selectedPlaces: [...this.context.selectedPlaces],
                selectedHotels: [...this.context.selectedHotels],
                selectedFlights: [...this.context.selectedFlights],
                itinerary: this.context.itinerary.map(item => ({ ...item })),
                weather: this.context.weather ? { ...this.context.weather } : null
            };
        }

        getMinimalContext(forEvent = '') {
            const full = this.get();
            const minimal = {};

            if (full.destination) minimal.destination = full.destination;
            if (full.budget !== null) {
                minimal.budget = full.budget;
                minimal.currentSpend = full.currentSpend;
                minimal.remainingBudget = full.remainingBudget;
            }
            if (full.tripDuration) minimal.tripDuration = full.tripDuration;
            if (full.travelers > 1) minimal.travelers = full.travelers;
            if (full.weather) minimal.weather = full.weather.condition || full.weather;
            if (full.timeOfDay) minimal.timeOfDay = full.timeOfDay;
            if (full.currentLocation?.name) minimal.currentLocation = full.currentLocation.name;

            const currentAct = this.getCurrentActivity();
            if (currentAct) minimal.currentActivity = currentAct.place;
            const nextAct = this.getNextActivity();
            if (nextAct) minimal.nextActivity = nextAct.place;

            if (full.selectedPlaces.length > 0) {
                minimal.selectedPlacesCount = full.selectedPlaces.length;
                minimal.latestPlace = full.selectedPlaces[full.selectedPlaces.length - 1];
            }
            if (full.selectedHotels.length > 0) {
                minimal.latestHotel = full.selectedHotels[full.selectedHotels.length - 1];
            }
            if (full.selectedFlights.length > 0) {
                minimal.latestFlight = full.selectedFlights[full.selectedFlights.length - 1];
            }

            return minimal;
        }

        computeTimeOfDay(hour = new Date().getHours()) {
            if (hour >= 5 && hour < 12) return 'morning';
            if (hour >= 12 && hour < 17) return 'afternoon';
            if (hour >= 17 && hour < 21) return 'evening';
            return 'night';
        }

        recalculateBudget() {
            if (typeof this.context.budget === 'number' && this.context.budget > 0) {
                this.context.remainingBudget = Math.max(0, this.context.budget - this.context.currentSpend);
            } else {
                this.context.remainingBudget = null;
            }
        }

        update(partialContext = {}) {
            if (!partialContext || typeof partialContext !== 'object') return;

            let changed = false;
            for (const [key, value] of Object.entries(partialContext)) {
                if (key === 'currentLocation' && typeof value === 'object') {
                    this.context.currentLocation = { ...this.context.currentLocation, ...value };
                    changed = true;
                } else if (key === 'budget' || key === 'currentSpend') {
                    if (this.context[key] !== value) {
                        this.context[key] = value;
                        this.recalculateBudget();
                        changed = true;
                    }
                } else if (this.context[key] !== value) {
                    this.context[key] = value;
                    changed = true;
                }
            }

            if (changed) {
                this.notify();
            }
        }

        /**
         * Centralized Event Handler updating Travel Context
         * @param {string} eventName 
         * @param {*} [eventData] 
         */
        handleEvent(eventName, eventData = null) {
            if (!eventName) return;

            switch (eventName) {
                case 'DESTINATION_SELECTED': {
                    const dest = typeof eventData === 'string'
                        ? eventData
                        : (eventData?.destination || eventData?.city || eventData?.name || 'Paris');
                    this.update({
                        destination: dest,
                        currentAction: 'destination_selected',
                        currentLocation: { name: dest }
                    });
                    break;
                }

                case 'LOCATION_CHANGED':
                case 'USER_ARRIVED': {
                    const locName = typeof eventData === 'string'
                        ? eventData
                        : (eventData?.name || eventData?.location || this.context.destination || 'Destination');
                    this.update({
                        currentLocation: {
                            name: locName,
                            latitude: eventData?.latitude || null,
                            longitude: eventData?.longitude || null
                        },
                        currentAction: eventName.toLowerCase()
                    });
                    break;
                }

                case 'PLACE_SELECTED': {
                    const place = typeof eventData === 'string'
                        ? eventData
                        : (eventData?.name || eventData?.title || 'Attraction');
                    const cost = Number(eventData?.price || eventData?.cost || 0);
                    const places = [...this.context.selectedPlaces, place];
                    this.update({
                        selectedPlaces: places,
                        currentSpend: this.context.currentSpend + cost,
                        currentAction: 'place_selected'
                    });
                    break;
                }

                case 'PLACE_REMOVED': {
                    const place = typeof eventData === 'string' ? eventData : eventData?.name;
                    const places = this.context.selectedPlaces.filter(p => p !== place);
                    this.update({ selectedPlaces: places, currentAction: 'place_removed' });
                    break;
                }

                case 'HOTEL_SELECTED': {
                    const hotelName = typeof eventData === 'string'
                        ? eventData
                        : (eventData?.name || eventData?.hotelName || 'Luxury Hotel');
                    const price = Number(eventData?.price || eventData?.cost || 0);
                    const hotels = [...this.context.selectedHotels, hotelName];
                    this.update({
                        selectedHotels: hotels,
                        currentSpend: this.context.currentSpend + price,
                        currentAction: 'hotel_selected'
                    });
                    break;
                }

                case 'FLIGHT_SELECTED': {
                    const flight = typeof eventData === 'string'
                        ? eventData
                        : (eventData?.flightNumber || eventData?.route || 'Air Express');
                    const price = Number(eventData?.price || eventData?.cost || 0);
                    const flights = [...this.context.selectedFlights, flight];
                    this.update({
                        selectedFlights: flights,
                        currentSpend: this.context.currentSpend + price,
                        currentAction: 'flight_selected'
                    });
                    break;
                }

                case 'BUDGET_CHANGED': {
                    const budgetVal = typeof eventData === 'number'
                        ? eventData
                        : (eventData?.budget || eventData?.amount || 100000);
                    this.update({ budget: budgetVal, currentAction: 'budget_changed' });
                    break;
                }

                case 'BUDGET_EXCEEDED': {
                    const budgetVal = typeof eventData === 'number'
                        ? eventData
                        : (eventData?.budget || this.context.budget || 100000);
                    this.update({ budget: budgetVal, currentAction: 'budget_exceeded' });
                    break;
                }

                case 'WEATHER_CHANGED': {
                    let weatherObj = null;
                    if (typeof eventData === 'string') {
                        weatherObj = { condition: eventData, severity: eventData.includes('rain') ? 'warning' : 'normal' };
                    } else if (eventData && typeof eventData === 'object') {
                        weatherObj = { ...eventData };
                    }
                    this.update({ weather: weatherObj, currentAction: 'weather_changed' });
                    break;
                }

                case 'ITINERARY_UPDATED':
                case 'ITINERARY_CREATED': {
                    const items = Array.isArray(eventData) ? eventData : (eventData?.activities || eventData?.itinerary || []);
                    this.update({ itinerary: items, currentAction: 'itinerary_updated' });
                    break;
                }

                case 'MAP_OPENED':
                case 'MAP_ZOOMED': {
                    this.update({ mapState: eventData || 'active', currentAction: eventName.toLowerCase() });
                    break;
                }

                case 'PROACTIVE_MODE_TOGGLED': {
                    const enabled = typeof eventData === 'boolean' ? eventData : !this.context.proactiveReactionsEnabled;
                    this.update({ proactiveReactionsEnabled: enabled });
                    break;
                }

                default:
                    if (eventData && typeof eventData === 'object') {
                        this.update(eventData);
                    }
                    break;
            }
        }

        // =========================================================================
        // Context Inquiry & Conflict Analysis Helpers
        // =========================================================================

        getCurrentActivity() {
            if (!this.context.itinerary || this.context.itinerary.length === 0) return null;
            return this.context.itinerary[0];
        }

        getNextActivity() {
            if (!this.context.itinerary || this.context.itinerary.length < 2) return null;
            return this.context.itinerary[1];
        }

        hasOutdoorActivities() {
            if (!this.context.itinerary || this.context.itinerary.length === 0) return false;
            return this.context.itinerary.some(item => item.isOutdoor !== false);
        }

        /**
         * Basic schedule conflict detection between successive activities
         * @returns {{ hasConflict: boolean, conflicts: Array }}
         */
        detectItineraryConflicts() {
            const items = this.context.itinerary;
            if (!items || items.length < 2) return { hasConflict: false, conflicts: [] };

            const conflicts = [];
            for (let i = 0; i < items.length - 1; i++) {
                const act1 = items[i];
                const act2 = items[i + 1];

                if (act1.time && act2.time) {
                    const [h1, m1] = act1.time.split(':').map(Number);
                    const [h2, m2] = act2.time.split(':').map(Number);
                    const t1 = h1 * 60 + (m1 || 0);
                    const t2 = h2 * 60 + (m2 || 0);

                    const gap = t2 - t1;
                    const minRequiredGap = act1.durationMins || 60; // minimum required gap

                    if (gap < minRequiredGap) {
                        conflicts.push({
                            activity1: act1.place || act1.title || 'Activity 1',
                            activity2: act2.place || act2.title || 'Activity 2',
                            gapMinutes: gap,
                            requiredMinutes: minRequiredGap
                        });
                    }
                }
            }

            return {
                hasConflict: conflicts.length > 0,
                conflicts
            };
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.get());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const snapshot = this.get();
            for (const listener of this.listeners) {
                try {
                    listener(snapshot);
                } catch (err) {
                    console.error('[BuddyContext] Error in change listener:', err);
                }
            }
        }

        reset() {
            this.context = {
                destination: null,
                currentLocation: { latitude: null, longitude: null, name: null },
                currentPage: null,
                currentAction: null,
                tripStartDate: null,
                tripEndDate: null,
                tripDuration: null,
                travelers: 1,
                budget: null,
                currentSpend: 0,
                remainingBudget: null,
                budgetWarningThreshold: 0.80,
                selectedFlights: [],
                selectedHotels: [],
                selectedPlaces: [],
                itinerary: [],
                weather: null,
                timeOfDay: this.computeTimeOfDay(),
                localTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                mapState: null,
                proactiveReactionsEnabled: true
            };
            this.notify();
        }
    }

    const buddyContext = new BuddyContext();

    global.BuddyContext = BuddyContext;
    global.buddyContext = buddyContext;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { buddyContext, BuddyContext };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
