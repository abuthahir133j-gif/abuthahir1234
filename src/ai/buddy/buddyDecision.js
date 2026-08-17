/**
 * Travel AI Buddy — Step 4: Decision & Proactive Event Filter Engine
 * 
 * Manages 4-tier event priorities, categorized cooldowns (budget, weather, itinerary),
 * session reaction history, and proactive mode gating.
 */
(function (global) {
    const EVENT_PRIORITY = {
        CRITICAL: 3,
        IMPORTANT: 2,
        NORMAL: 1,
        IGNORE: 0
    };

    const DEFAULT_EVENT_PRIORITIES = {
        // Critical (Priority 3)
        BOOKING_COMPLETED: EVENT_PRIORITY.CRITICAL,
        BUDGET_EXCEEDED: EVENT_PRIORITY.CRITICAL,
        TRIP_COMPLETED: EVENT_PRIORITY.CRITICAL,
        MAJOR_WEATHER_WARNING: EVENT_PRIORITY.CRITICAL,
        ITINERARY_COMPLETED: EVENT_PRIORITY.CRITICAL,

        // Important (Priority 2)
        HOTEL_OVER_BUDGET: EVENT_PRIORITY.IMPORTANT,
        WEATHER_AFFECTS_ITINERARY: EVENT_PRIORITY.IMPORTANT,
        ITINERARY_CONFLICT: EVENT_PRIORITY.IMPORTANT,
        DESTINATION_SELECTED: EVENT_PRIORITY.IMPORTANT,
        HOTEL_SELECTED: EVENT_PRIORITY.IMPORTANT,
        FLIGHT_SELECTED: EVENT_PRIORITY.IMPORTANT,
        USER_ARRIVED: EVENT_PRIORITY.IMPORTANT,
        USER_STARTED_TRIP: EVENT_PRIORITY.IMPORTANT,
        USER_ASKED_BUDDY: EVENT_PRIORITY.IMPORTANT,
        BUDGET_WARNING: EVENT_PRIORITY.IMPORTANT,
        LEVEL_COMPLETED: EVENT_PRIORITY.IMPORTANT,
        DAILY_CHALLENGE: EVENT_PRIORITY.IMPORTANT,

        // Normal (Priority 1)
        PLACE_SELECTED: EVENT_PRIORITY.NORMAL,
        WEATHER_CHANGED: EVENT_PRIORITY.NORMAL,
        MAP_OPENED: EVENT_PRIORITY.NORMAL,
        ITINERARY_UPDATED: EVENT_PRIORITY.NORMAL,
        TAB_CHANGED: EVENT_PRIORITY.NORMAL,

        // Ignore (Priority 0)
        PAGE_OPENED: EVENT_PRIORITY.IGNORE,
        BUTTON_CLICK: EVENT_PRIORITY.IGNORE,
        MOUSE_HOVER: EVENT_PRIORITY.IGNORE,
        MAP_ZOOMED: EVENT_PRIORITY.IGNORE,
        MAP_DRAGGED: EVENT_PRIORITY.IGNORE,
        SCROLL: EVENT_PRIORITY.IGNORE
    };

    class BuddyDecisionEngine {
        constructor(options = {}) {
            // Categorized Cooldowns (in milliseconds)
            this.cooldowns = {
                globalCooldown: options.globalCooldown ?? (options.cooldownMs ?? 2000),
                budgetCooldown: options.budgetCooldown ?? 60000,       // 1 min cooldown for budget alerts
                weatherCooldown: options.weatherCooldown ?? 300000,   // 5 min cooldown for weather alerts
                itineraryCooldown: options.itineraryCooldown ?? 60000 // 1 min cooldown for schedule warnings
            };

            this.dedupWindowMs = options.dedupWindowMs ?? 3000;
            this.eventPriorities = { ...DEFAULT_EVENT_PRIORITIES, ...(options.eventPriorities || {}) };

            // Timestamps
            this.lastExecutionTime = 0;
            this.lastCategoryExecution = {
                budget: 0,
                weather: 0,
                itinerary: 0
            };

            this.lastEventHash = null;
            this.lastEventTime = 0;

            // Session Reaction History
            this.sessionHistory = [];
        }

        getPriority(eventName) {
            return this.eventPriorities[eventName] ?? EVENT_PRIORITY.NORMAL;
        }

        getCategoryForEvent(eventName, observation = null) {
            const type = observation?.type || eventName;
            if (type.includes('BUDGET') || type.includes('HOTEL_OVER')) return 'budget';
            if (type.includes('WEATHER')) return 'weather';
            if (type.includes('ITINERARY') || type.includes('CONFLICT')) return 'itinerary';
            return 'general';
        }

        createEventHash(eventName, eventData) {
            try {
                return `${eventName}::${JSON.stringify(eventData || {})}`;
            } catch (e) {
                return `${eventName}::${String(eventData)}`;
            }
        }

        /**
         * Determine if an event / observation should trigger a Buddy reaction
         * @param {string} eventName 
         * @param {*} [eventData] 
         * @param {Object} [observation] 
         * @param {boolean} [proactiveEnabled=true] 
         * @returns {{ allowed: boolean, reason?: string, priority: number }}
         */
        shouldProcessEvent(eventName, eventData = null, observation = null, proactiveEnabled = true) {
            const eventKey = observation?.type || eventName;
            const priority = this.getPriority(eventKey);
            const now = Date.now();

            // 1. Proactive Mode Gate (Allow user direct queries, but suppress unsolicited if proactive disabled)
            if (!proactiveEnabled && eventName !== 'USER_ASKED_BUDDY') {
                return {
                    allowed: false,
                    reason: 'Proactive reactions disabled by user setting',
                    priority
                };
            }

            // 2. Ignore Priority 0 events
            if (priority === EVENT_PRIORITY.IGNORE) {
                return {
                    allowed: false,
                    reason: 'Ignored minor UI event',
                    priority
                };
            }

            // 3. Critical events always bypass cooldowns
            if (priority === EVENT_PRIORITY.CRITICAL) {
                return { allowed: true, priority };
            }

            // 4. Duplicate Event Throttle
            const eventHash = this.createEventHash(eventKey, eventData);
            if (this.lastEventHash === eventHash && (now - this.lastEventTime < this.dedupWindowMs)) {
                return {
                    allowed: false,
                    reason: 'Duplicate event throttled',
                    priority
                };
            }

            // 5. Category-Specific Cooldown
            const category = this.getCategoryForEvent(eventName, observation);
            if (category === 'budget' && (now - this.lastCategoryExecution.budget < this.cooldowns.budgetCooldown)) {
                return {
                    allowed: false,
                    reason: 'Budget alert cooldown active',
                    priority
                };
            }
            if (category === 'weather' && (now - this.lastCategoryExecution.weather < this.cooldowns.weatherCooldown)) {
                return {
                    allowed: false,
                    reason: 'Weather alert cooldown active',
                    priority
                };
            }
            if (category === 'itinerary' && (now - this.lastCategoryExecution.itinerary < this.cooldowns.itineraryCooldown)) {
                return {
                    allowed: false,
                    reason: 'Itinerary conflict cooldown active',
                    priority
                };
            }

            // 6. Global Cooldown Check
            if (now - this.lastExecutionTime < this.cooldowns.globalCooldown) {
                return {
                    allowed: false,
                    reason: 'Global cooldown active',
                    priority
                };
            }

            return { allowed: true, priority };
        }

        recordExecution(eventName, eventData = null, observation = null, decision = null) {
            const now = Date.now();
            const eventKey = observation?.type || eventName;
            const category = this.getCategoryForEvent(eventName, observation);

            this.lastExecutionTime = now;
            this.lastEventTime = now;
            this.lastEventHash = this.createEventHash(eventKey, eventData);

            if (category && this.lastCategoryExecution[category] !== undefined) {
                this.lastCategoryExecution[category] = now;
            }

            // Append to Session History
            this.sessionHistory.push({
                type: eventKey,
                observation: observation?.type || null,
                timestamp: now,
                message: decision?.message || null,
                emotion: decision?.emotion || null
            });

            // Keep session history to last 50 entries
            if (this.sessionHistory.length > 50) {
                this.sessionHistory.shift();
            }
        }

        getSessionHistory() {
            return [...this.sessionHistory];
        }

        reset() {
            this.lastExecutionTime = 0;
            this.lastCategoryExecution = { budget: 0, weather: 0, itinerary: 0 };
            this.lastEventHash = null;
            this.lastEventTime = 0;
            this.sessionHistory = [];
        }
    }

    const buddyDecision = new BuddyDecisionEngine();

    global.EVENT_PRIORITY = EVENT_PRIORITY;
    global.BuddyDecisionEngine = BuddyDecisionEngine;
    global.buddyDecision = buddyDecision;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            EVENT_PRIORITY,
            BuddyDecisionEngine,
            buddyDecision
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
