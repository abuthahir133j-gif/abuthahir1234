/**
 * Travel AI Buddy — Step 4: Proactive AI Brain & Observation Coordinator
 * 
 * Orchestrates Travel Context, Observation Engine, Categorized Decision Filter,
 * Prompt Builder, Contextual Intelligence, and Buddy Controller Execution.
 */
(function (global) {
    const _buddyContext = (typeof global.buddyContext !== 'undefined')
        ? global.buddyContext
        : require('./buddyContext').buddyContext;

    const _buddyObserver = (typeof global.buddyObserver !== 'undefined')
        ? global.buddyObserver
        : require('./buddyObserver').buddyObserver;

    const _buddyPrompt = (typeof global.buildAIInput !== 'undefined')
        ? { buildAIInput: global.buildAIInput, buildUserQuestionInput: global.buildUserQuestionInput, BUDDY_SYSTEM_PROMPT: global.BUDDY_SYSTEM_PROMPT }
        : require('./buddyPrompt');

    const _buddyResponse = (typeof global.validateAIResponse !== 'undefined')
        ? { validateAIResponse: global.validateAIResponse, createFallbackDecision: global.createFallbackDecision }
        : require('./buddyResponse');

    const _buddyDecision = (typeof global.buddyDecision !== 'undefined')
        ? global.buddyDecision
        : require('./buddyDecision').buddyDecision;

    class BuddyAI {
        constructor(controller = null, options = {}) {
            this.controller = controller;
            this.context = options.context || _buddyContext;
            this.observer = options.observer || new _buddyObserver.constructor(this.context);
            if (this.observer) {
                this.observer.context = this.context;
            }
            this.decisionEngine = options.decisionEngine || _buddyDecision;
            this.promptBuilder = _buddyPrompt;
            this.responseValidator = _buddyResponse;

            this.backendEndpoint = options.backendEndpoint || '/api/buddy';
            this.isProcessing = false;
            this.lastDecision = null;
            this.lastObservation = null;
            this.listeners = new Set();
        }

        setController(controller) {
            this.controller = controller;
        }

        onAIUpdate(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        notifyUpdate(data) {
            for (const listener of this.listeners) {
                try {
                    listener({
                        ...data,
                        context: this.context.get(),
                        lastObservation: this.lastObservation
                    });
                } catch (err) {
                    console.error('[BuddyAI] Error in update listener:', err);
                }
            }
        }

        /**
         * Centralized Event & Proactive Observation Processor
         * @param {string} eventName 
         * @param {*} [eventData] 
         * @returns {Promise<Object|null>} Validated Buddy Decision or null if ignored/filtered
         */
        async processEvent(eventName, eventData = null) {
            if (!eventName) return null;

            console.log(`[BuddyAI] Incoming event: "${eventName}"`, eventData);

            // 1. Update Central Travel Context
            this.context.handleEvent(eventName, eventData);
            const ctx = this.context.get();

            // 2. Detect Proactive Travel Observations
            const observation = this.observer.detectObservation(eventName, eventData);
            this.lastObservation = observation;
            if (observation) {
                console.log(`[BuddyAI] 🔍 Detected Proactive Observation: [${observation.type}] (Severity: ${observation.severity})`, observation.data);
            }

            // 3. Evaluate Decision Engine (Priority, Proactive Gate, Cooldowns, Deduplication)
            const filterResult = this.decisionEngine.shouldProcessEvent(
                eventName,
                eventData,
                observation,
                ctx.proactiveReactionsEnabled
            );

            if (!filterResult.allowed) {
                console.log(`[BuddyAI] Event "${eventName}" filtered: ${filterResult.reason}`);
                this.notifyUpdate({ status: 'filtered', event: eventName, reason: filterResult.reason, observation });
                return null;
            }

            this.isProcessing = true;
            this.notifyUpdate({ status: 'thinking', event: eventName, observation });

            // 4. Character Visual Reaction to Observation
            if (this.controller) {
                if (observation?.type === 'HOTEL_OVER_BUDGET' || observation?.type === 'BUDGET_EXCEEDED') {
                    this.controller.setEmotion('worried');
                    this.controller.play('surprised');
                } else if (observation?.type === 'WEATHER_AFFECTS_ITINERARY' || observation?.type === 'ITINERARY_CONFLICT') {
                    this.controller.setEmotion('thinking');
                    this.controller.play('thinking');
                } else if (observation?.type === 'USER_ARRIVED') {
                    this.controller.setEmotion('excited');
                    this.controller.play('celebrate');
                } else {
                    this.controller.play('thinking');
                    this.controller.setEmotion('thinking');
                }
            }

            // 5. Build Structured AI Input Slice
            const contextSlice = this.context.getMinimalContext(eventName);
            const aiInput = this.promptBuilder.buildAIInput(eventName, eventData, contextSlice, observation);

            // 6. Query AI Engine or Smart Contextual Local Generator
            let rawResponse = null;
            try {
                rawResponse = await this.queryAIEngine(aiInput);
            } catch (err) {
                console.warn('[BuddyAI] AI request failed, using safe fallback:', err.message);
            }

            // 7. Validate Structured JSON Contract
            const decision = this.responseValidator.validateAIResponse(rawResponse, observation?.type || eventName);
            this.lastDecision = decision;
            this.isProcessing = false;

            // 8. Record Execution & Session History
            this.decisionEngine.recordExecution(eventName, eventData, observation, decision);

            // 9. Dispatch Decision to Buddy Controller
            this.applyDecisionToController(decision);

            // 10. Notify Subscribers & Debug Monitors
            this.notifyUpdate({
                status: decision.isFallback ? 'fallback' : 'success',
                event: eventName,
                observation,
                decision
            });

            return decision;
        }

        async askBuddy(question) {
            if (!question || !String(question).trim()) return null;

            const cleanQuestion = String(question).trim();
            console.log(`[BuddyAI] User asked: "${cleanQuestion}"`);

            this.isProcessing = true;
            this.notifyUpdate({ status: 'thinking', event: 'USER_ASKED_BUDDY', question: cleanQuestion });

            if (this.controller) {
                this.controller.play('thinking');
                this.controller.setEmotion('thinking');
                this.controller.say('Thinking about your question... 🤔', 1500);
            }

            const contextSlice = this.context.getMinimalContext('USER_ASKED_BUDDY');
            const aiInput = this.promptBuilder.buildUserQuestionInput(cleanQuestion, contextSlice);

            let rawResponse = null;
            try {
                rawResponse = await this.queryAIEngine(aiInput);
            } catch (err) {
                console.warn('[BuddyAI] User question query error:', err.message);
            }

            const decision = this.responseValidator.validateAIResponse(rawResponse, 'USER_ASKED_BUDDY');
            this.lastDecision = decision;
            this.isProcessing = false;

            this.decisionEngine.recordExecution('USER_ASKED_BUDDY', cleanQuestion, null, decision);
            this.applyDecisionToController(decision);

            this.notifyUpdate({
                status: decision.isFallback ? 'fallback' : 'success',
                event: 'USER_ASKED_BUDDY',
                question: cleanQuestion,
                decision
            });

            return decision;
        }

        applyDecisionToController(decision) {
            if (!this.controller || !decision) return;

            if (decision.animation) {
                this.controller.play(decision.animation, decision.duration);
            }

            if (decision.emotion) {
                this.controller.setEmotion(decision.emotion);
            }

            if (decision.message) {
                this.controller.say(decision.message, decision.duration);
            }
        }

        async queryAIEngine(aiInput) {
            const isHttpLocation = typeof window !== 'undefined' && window.location && window.location.protocol && window.location.protocol.startsWith('http');
            const isExplicitHttpEndpoint = typeof this.backendEndpoint === 'string' && this.backendEndpoint.startsWith('http');

            // Only attempt fetch if running on a real web server or explicit remote backend URL
            if (isHttpLocation || isExplicitHttpEndpoint) {
                try {
                    const res = await fetch(this.backendEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(aiInput),
                        signal: AbortSignal.timeout(3000)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        return data;
                    }
                } catch (e) {}
            }

            return this.generateSmartContextualResponse(aiInput);
        }

        /**
         * Proactive Smart Contextual Response Generator
         * @param {Object} aiInput 
         * @returns {Object} Structured JSON decision
         */
        generateSmartContextualResponse(aiInput) {
            const { event, question, context = {}, payload, observation } = aiInput;
            const dest = context.destination || (typeof payload === 'string' ? payload : payload?.destination) || 'your destination';
            const budget = context.budget || payload?.budget || null;
            const obsType = observation?.type;

            // =====================================================================
            // Proactive Scenario 1: Hotel Over Budget / Better Hotel Option
            // =====================================================================
            if (obsType === 'HOTEL_OVER_BUDGET') {
                return {
                    message: "That hotel is slightly over our remaining budget. Want me to find a cheaper option? 🏨💸",
                    emotion: "worried",
                    animation: "surprised",
                    intent: "warning",
                    gesture: "point"
                };
            }

            if (obsType === 'BETTER_HOTEL_OPTION') {
                return {
                    message: "I found another hotel that is cheaper and closer to your planned activities! 🏨✨",
                    emotion: "excited",
                    animation: "happy",
                    intent: "recommendation",
                    gesture: "point"
                };
            }

            if (obsType === 'CHEAPER_FLIGHT_FOUND') {
                return {
                    message: "Good news! I found a cheaper flight deal for the same trip! 🛫💰",
                    emotion: "excited",
                    animation: "celebrate",
                    intent: "discovery",
                    gesture: "celebrate"
                };
            }

            if (obsType === 'PLACE_CLOSING_SOON') {
                const placeName = observation?.data?.placeName || 'The museum';
                return {
                    message: `${placeName} is closing soon! We should move it earlier if you want to visit today! ⏰`,
                    emotion: "worried",
                    animation: "thinking",
                    intent: "warning",
                    gesture: "point"
                };
            }

            if (obsType === 'PREFERENCE_MATCH') {
                const preference = observation?.data?.preference || 'your preferred travel style';
                return {
                    message: `Since you enjoy ${preference}, this place matches your travel vibe perfectly! 🥐✨`,
                    emotion: "excited",
                    animation: "happy",
                    intent: "recommendation",
                    gesture: "point"
                };
            }

            if (obsType === 'SAVED_PLACE_NEARBY') {
                const placeName = observation?.data?.placeName || 'one of your saved spots';
                return {
                    message: `Hey! ${placeName} from your saved bookmarks is right around the corner! 📍🔖`,
                    emotion: "happy",
                    animation: "point",
                    intent: "discovery",
                    gesture: "point"
                };
            }

            if (obsType === 'STYLE_MISMATCH_WARNING') {
                return {
                    message: "Your itinerary is getting quite packed for your preferred relaxed pacing! We could space it out! ☕",
                    emotion: "thinking",
                    animation: "thinking",
                    intent: "warning",
                    gesture: "thinking"
                };
            }

            // =====================================================================
            // Proactive Scenario 2: Weather Affects Outdoor Itinerary
            // =====================================================================
            if (obsType === 'WEATHER_AFFECTS_ITINERARY') {
                const actName = observation?.data?.activity || 'outdoor sights';
                return {
                    message: `Looks like rain is expected during ${actName}. We should consider an indoor option! 🌧️`,
                    emotion: "worried",
                    animation: "thinking",
                    gesture: null
                };
            }

            // =====================================================================
            // Proactive Scenario 3: Itinerary Conflict
            // =====================================================================
            if (obsType === 'ITINERARY_CONFLICT') {
                return {
                    message: "These two activities are very close together in time. We may need a little more travel time! ⏱️",
                    emotion: "thinking",
                    animation: "thinking",
                    gesture: "point"
                };
            }

            // =====================================================================
            // Proactive Scenario 4: User Arrived at Destination
            // =====================================================================
            if (obsType === 'USER_ARRIVED' || event === 'USER_ARRIVED') {
                const loc = observation?.data?.location || dest;
                return {
                    message: `Welcome to ${loc}! You are here! Let us start exploring! 🎉`,
                    emotion: "excited",
                    animation: "celebrate",
                    gesture: null
                };
            }

            // =====================================================================
            // Proactive Scenario 5: 80% Budget Warning
            // =====================================================================
            if (obsType === 'BUDGET_WARNING') {
                const pct = observation?.data?.percentUsed || 80;
                return {
                    message: `Heads up! We have used ${pct}% of our planned trip budget! 💰`,
                    emotion: "thinking",
                    animation: "point",
                    gesture: null
                };
            }

            // Standard Trip Events
            if (event === 'USER_STARTED_TRIP') {
                const destMention = context.destination ? ` to ${context.destination}` : '';
                return {
                    message: `Ready for an incredible journey${destMention}? Let us make it unforgettable! ✈️`,
                    emotion: 'happy',
                    animation: 'wave',
                    gesture: null
                };
            }

            if (event === 'DESTINATION_SELECTED') {
                const cityTips = {
                    paris: 'Paris is magical! Make sure to grab fresh croissants by the Eiffel Tower! 🥐',
                    tokyo: 'Tokyo is breathtaking! Get ready for amazing ramen and neon street views! 🍜',
                    rome: 'Rome! Step into ancient history and enjoy delicious authentic gelato! 🏛️',
                    london: 'London calling! Do not forget to ride the classic red double-decker buses! 🎡',
                    dubai: 'Dubai is futuristic! Prepare for dazzling skylines and desert safaris! 🏙️',
                    bali: 'Bali is pure paradise! Stunning beaches and lush tropical waterfalls await! 🌴'
                };

                const cityKey = String(dest).toLowerCase().trim();
                const tip = cityTips[cityKey] || `${dest}! Outstanding pick! I have prepared top sights for you! 🌟`;

                return {
                    message: tip,
                    emotion: 'excited',
                    animation: 'happy',
                    gesture: null
                };
            }

            if (event === 'BUDGET_EXCEEDED') {
                const budgetText = budget ? ` ₹${Number(budget).toLocaleString()}` : '';
                return {
                    message: `Whoa there! That selection goes above your target budget${budgetText}! 💸`,
                    emotion: 'surprised',
                    animation: 'surprised',
                    gesture: 'look_at_user'
                };
            }

            if (event === 'ITINERARY_COMPLETED') {
                return {
                    message: `Your complete itinerary is ready! Time to pack your bags and go! 🎉`,
                    emotion: 'excited',
                    animation: 'celebrate',
                    gesture: 'jump'
                };
            }

            if (event === 'USER_ASKED_BUDDY' || question) {
                const q = String(question || '').toLowerCase();
                if (q.includes('where') || q.includes('place') || q.includes('go') || q.includes('visit')) {
                    return {
                        message: `In ${dest}, visit the historic landmarks, famous markets, and local scenic spots! 📍`,
                        emotion: 'happy',
                        animation: 'point',
                        gesture: null
                    };
                }
                if (q.includes('food') || q.includes('eat') || q.includes('restaurant') || q.includes('dish')) {
                    return {
                        message: `You must try the local street food delicacies and signature desserts in ${dest}! 🍽️`,
                        emotion: 'excited',
                        animation: 'happy',
                        gesture: null
                    };
                }
                if (q.includes('weather') || q.includes('pack') || q.includes('clothes') || q.includes('climate')) {
                    const w = context.weather || 'mild and pleasant';
                    return {
                        message: `The weather in ${dest} is ${w}. Pack comfortable walking shoes! 👟`,
                        emotion: 'neutral',
                        animation: 'thinking',
                        gesture: null
                    };
                }
                if (q.includes('budget') || q.includes('cost') || q.includes('money') || q.includes('cheap') || q.includes('expensive')) {
                    return {
                        message: `Look for travel discount passes and free museum entry days to save big! 💰`,
                        emotion: 'happy',
                        animation: 'thinking',
                        gesture: null
                    };
                }

                return {
                    message: `Great travel question! I am here to help you get the best experience in ${dest}! 🧭`,
                    emotion: 'happy',
                    animation: 'wave',
                    gesture: null
                };
            }

            if (event === 'FLIGHT_SELECTED') {
                return {
                    message: `Flight locked in! Window or aisle seat? Either way, adventure awaits! 🛫`,
                    emotion: 'excited',
                    animation: 'celebrate',
                    gesture: null
                };
            }

            if (event === 'HOTEL_SELECTED') {
                return {
                    message: `Nice stay selected! Cozy comfort after a day of exploring! 🏨`,
                    emotion: 'happy',
                    animation: 'happy',
                    gesture: null
                };
            }

            if (event === 'LEVEL_COMPLETED') {
                return {
                    message: `Level conquered with flying colors! Onward to the next challenge! ⭐`,
                    emotion: 'excited',
                    animation: 'celebrate',
                    gesture: null
                };
            }

            return {
                message: `Nice choice! We are building an awesome travel plan together! ✨`,
                emotion: 'happy',
                animation: 'happy',
                gesture: null
            };
        }
    }

    const buddyAI = new BuddyAI();

    global.BuddyAI = BuddyAI;
    global.buddyAI = buddyAI;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { BuddyAI, buddyAI };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
