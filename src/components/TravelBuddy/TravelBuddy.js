/**
 * Travel AI Buddy — Step 7: Persistent Trip Memory & Personalization
 * 
 * Top-level master component orchestrating the Scene, Controller, Animation Manager,
 * Event Bus, Travel Context, Travel Data Layer, Memory & Personalization Layer,
 * AI Brain, Voice Controller (Child TTS + STT), Character Behavior Engine, and Developer Debug Panel.
 */
(function (global) {
    const _buddyConfig = (typeof global.buddyConfig !== 'undefined')
        ? global.buddyConfig
        : require('./buddy.config');

    const _buddyEvents = (typeof global.buddyEvents !== 'undefined')
        ? global.buddyEvents
        : require('../../events/buddyEvents').buddyEvents;

    const _BuddyAnimations = (typeof global.BuddyAnimations !== 'undefined')
        ? global.BuddyAnimations
        : require('./BuddyAnimations');

    const _BuddyScene = (typeof global.BuddyScene !== 'undefined')
        ? global.BuddyScene
        : require('./BuddyScene');

    const _BuddyController = (typeof global.BuddyController !== 'undefined')
        ? global.BuddyController
        : require('./BuddyController');

    const _buddyContext = (typeof global.buddyContext !== 'undefined')
        ? global.buddyContext
        : require('../../ai/buddy/buddyContext').buddyContext;

    const _travelDataService = (typeof global.travelDataService !== 'undefined')
        ? global.travelDataService
        : require('../../services/travel/travelDataService').travelDataService;

    const _buddyMemory = (typeof global.buddyMemory !== 'undefined')
        ? global.buddyMemory
        : require('../../memory/buddy/buddyMemory').buddyMemory;

    const _buddyObserver = (typeof global.buddyObserver !== 'undefined')
        ? global.buddyObserver
        : require('../../ai/buddy/buddyObserver').buddyObserver;

    const _BuddyAI = (typeof global.BuddyAI !== 'undefined')
        ? global.BuddyAI
        : require('../../ai/buddy/buddyAI').BuddyAI;

    const _BuddyVoiceController = (typeof global.BuddyVoiceController !== 'undefined')
        ? global.BuddyVoiceController
        : require('../../voice/buddy/voiceController');

    const _BuddyBehaviorEngine = (typeof global.BuddyBehaviorEngine !== 'undefined')
        ? global.BuddyBehaviorEngine
        : require('../../character/buddy/BuddyBehaviorEngine').BuddyBehaviorEngine;

    class TravelBuddy {
        constructor(options = {}) {
            this.config = { ..._buddyConfig, ...options };
            this.events = _buddyEvents;
            this.context = _buddyContext;
            this.travelData = _travelDataService;
            this.memory = _buddyMemory;
            this.observer = _buddyObserver;
            
            this.animationManager = new _BuddyAnimations(this.config);
            this.scene = null;
            this.controller = null;
            this.ai = null;
            this.voice = null;
            this.behavior = null;
            this.debugPanelElement = null;

            this.unsubscribeEvents = [];
            this.isInitialized = false;
        }

        async init(targetContainer = document.body) {
            if (this.isInitialized) return this;

            // 1. Initialize Scene Viewport
            this.scene = new _BuddyScene(targetContainer, this.config, this.animationManager);
            await this.scene.mount();

            // 2. Initialize Controller
            this.controller = new _BuddyController(this.scene, this.animationManager, this.config);

            // 3. Initialize Character Behavior Engine
            this.behavior = new _BuddyBehaviorEngine(this.controller, this.scene, this.animationManager);
            this.behavior.init(this.controller, this.scene, this.animationManager);

            // 4. Initialize Proactive AI Brain with Travel Intelligence & Memory
            this.ai = new _BuddyAI(this.controller, {
                context: this.context,
                observer: this.observer,
                backendEndpoint: this.config.backendEndpoint || '/api/buddy'
            });

            // 5. Initialize Voice Engine (STT + Child TTS)
            this.voice = new _BuddyVoiceController(this.controller, this.ai, this.config);

            // 6. Connect Scene Voice UI -> Voice Controller
            if (this.scene && this.scene.micButton) {
                this.scene.micButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.voice.toggleListening();
                });
            }

            this.voice.onStateChange((state) => {
                if (this.scene) {
                    this.scene.setVoiceVisualState(state);
                }
                if (state === 'speaking' || state === 'listening' || state === 'processing') {
                    this.behavior?.idle?.pause();
                } else if (state === 'idle') {
                    this.behavior?.idle?.resume();
                }
            });

            // 7. Connect Event Bus -> Proactive AI Brain & Behavior Engine
            this.bindEventBus();

            // 8. Mount Developer Debug Panel
            if (this.config.debug?.enabled) {
                this.mountDebugPanel();
            }

            this.isInitialized = true;
            console.log('[TravelBuddy] Step 7 Persistent Trip Memory & Personalization Initialized. Accessible via window.travelBuddy');
            return this;
        }

        bindEventBus() {
            const reactions = this.config.reactions || {};
            const eventNames = new Set([
                ...Object.keys(reactions),
                'DESTINATION_SELECTED', 'HOTEL_SELECTED', 'FLIGHT_SELECTED',
                'PLACE_SELECTED', 'PLACE_REMOVED', 'BUDGET_CHANGED', 'BUDGET_EXCEEDED',
                'WEATHER_CHANGED', 'ITINERARY_UPDATED', 'ITINERARY_CREATED',
                'MAP_OPENED', 'MAP_ZOOMED', 'USER_ARRIVED', 'BOOKING_COMPLETED',
                'OBSERVATION_GENERATED'
            ]);

            for (const eventName of eventNames) {
                const unsub = this.events.on(eventName, (data) => {
                    if (this.ai) {
                        this.ai.processEvent(eventName, data).then(decision => {
                            if (decision) {
                                // Trigger Physical Character Behavior Sequence
                                this.behavior?.handleAIDecision(decision);

                                // Record conversation turn if meaningful message
                                if (decision.message) {
                                    this.memory.conversation.recordTurn(eventName, decision.message, decision.intent);
                                }

                                // Proactively speak high-importance observations via Child TTS
                                if (decision.message && this.context.get().proactiveReactionsEnabled) {
                                    if (this.voice && this.voice.synthesis.isSupported()) {
                                        this.voice.speakDecision(decision);
                                    }
                                }
                            }
                        });
                    } else if (this.controller) {
                        this.controller.handleEvent(eventName, data);
                    }
                });
                this.unsubscribeEvents.push(unsub);
            }
        }

        mountDebugPanel() {
            if (document.getElementById('buddy-debug-panel')) {
                document.getElementById('buddy-debug-panel').remove();
            }

            const ctx = this.context.get();
            const bState = this.behavior ? this.behavior.getState() : { emotion: { emotion: 'neutral', intensity: 0.5 }, attention: 'USER', gesture: 'idle' };
            const prefs = this.memory.preferences.get();
            const savedCount = this.memory.trips.getSavedPlaces().length;

            const panel = document.createElement('div');
            panel.id = 'buddy-debug-panel';
            panel.className = 'buddy-debug-panel';
            if (this.config.debug?.startMinimized) {
                panel.classList.add('minimized');
            }

            panel.innerHTML = `
                <div class="debug-header" id="debug-panel-header">
                    <span class="debug-title">🤖 TRAVEL BUDDY MEMORY</span>
                    <button class="debug-toggle-btn" id="debug-toggle-btn" title="Minimize / Expand">_</button>
                </div>
                <div class="debug-body">
                    <!-- Memory & Personalization Monitor (Step 7) -->
                    <div>
                        <div class="debug-section-title">Persistent Memory & Profile</div>
                        <div class="debug-state-box" id="debug-memory-box">
                            <div class="debug-state-row"><span class="state-key">Travel Style:</span> <span class="state-val" id="db-mem-style" style="color: #38BDF8;">${prefs.travelStyle.toUpperCase()}</span></div>
                            <div class="debug-state-row"><span class="state-key">Dietary:</span> <span class="state-val" id="db-mem-diet">${prefs.dietary}</span></div>
                            <div class="debug-state-row"><span class="state-key">Pacing:</span> <span class="state-val" id="db-mem-pace">${prefs.pacing}</span></div>
                            <div class="debug-state-row"><span class="state-key">Saved Places:</span> <span class="state-val val-true" id="db-mem-saved">${savedCount} saved</span></div>
                        </div>
                    </div>

                    <!-- Step 7 Personalization Test Actions -->
                    <div>
                        <div class="debug-section-title">Personalization Tests (Step 7)</div>
                        <div class="debug-btn-grid grid-2">
                            <button class="debug-btn btn-primary" id="btn-mem-foodie">🥐 Set Culture & Foodie</button>
                            <button class="debug-btn btn-primary" id="btn-mem-adventure">🧗 Set Adventure Style</button>
                            <button class="debug-btn btn-primary" id="btn-mem-veg">🥗 Toggle Vegetarian</button>
                            <button class="debug-btn btn-primary" id="btn-mem-save-place">🔖 Save Eiffel Tower</button>
                            <button class="debug-btn btn-primary" id="btn-mem-near-saved">📍 Test Saved Place Nearby</button>
                            <button class="debug-btn" id="btn-mem-clear">🧹 Reset Memory</button>
                        </div>
                    </div>

                    <!-- Travel Intelligence Monitor -->
                    <div>
                        <div class="debug-section-title">Travel Context & Data</div>
                        <div class="debug-state-box">
                            <div class="debug-state-row"><span class="state-key">Destination:</span> <span class="state-val">${ctx.destination || 'Paris'}</span></div>
                            <div class="debug-state-row"><span class="state-key">Budget / Rem:</span> <span class="state-val">₹${ctx.budget ? ctx.budget.toLocaleString() : '100,000'} / ₹${ctx.remainingBudget !== null ? ctx.remainingBudget.toLocaleString() : '18,000'}</span></div>
                            <div class="debug-state-row"><span class="state-key">Weather:</span> <span class="state-val">${ctx.weather ? (typeof ctx.weather === 'string' ? ctx.weather : `${ctx.weather.condition} (${ctx.weather.temperature}°C)`) : 'Sunny 24°C'}</span></div>
                        </div>
                    </div>

                    <!-- Character State -->
                    <div>
                        <div class="debug-section-title">Character & AI State</div>
                        <div class="debug-state-box" id="debug-behavior-box">
                            <div class="debug-state-row"><span class="state-key">Emotion / Gaze:</span> <span class="state-val" id="db-b-emotion">${bState.emotion.emotion.toUpperCase()} (${bState.emotion.intensity.toFixed(2)}) / ${bState.attention}</span></div>
                            <div class="debug-state-row"><span class="state-key">Last Observation:</span> <span class="state-val" id="db-b-obs" style="color: #38BDF8;">None</span></div>
                            <div class="debug-state-row" style="margin-top: 4px;"><span class="state-key">Message:</span></div>
                            <div id="db-b-msg" style="color: #9EFAFF; font-size: 11px; font-style: italic; margin-top: 2px; word-break: break-word;">"Memory & Personalization ready!"</div>
                        </div>
                    </div>

                    <!-- Voice Controls -->
                    <div>
                        <div class="debug-section-title">Voice Controls (Child Persona 🧒)</div>
                        <div class="debug-btn-grid grid-2">
                            <button class="debug-btn btn-primary" id="btn-voice-listen">🎙️ Start Listening</button>
                            <button class="debug-btn" id="btn-voice-stop-listen">⏹️ Stop Listening</button>
                            <button class="debug-btn btn-primary" id="btn-voice-test-tts">🔊 Test TTS (Child)</button>
                            <button class="debug-btn" id="btn-voice-stop-speak">🛑 Stop Speaking</button>
                        </div>
                    </div>

                    <!-- Ask Travel Buddy -->
                    <div>
                        <div class="debug-section-title">Ask Travel Buddy (Text Input)</div>
                        <div style="display: flex; gap: 4px;">
                            <input type="text" id="buddy-ask-input" class="buddy-debug-input" value="Recommend something for my style!" placeholder="Ask something..." style="flex: 1; background: rgba(4, 10, 18, 0.8); border: 1px solid rgba(75, 227, 255, 0.3); border-radius: 6px; color: #fff; font-size: 11px; padding: 4px 8px;">
                            <button class="debug-btn btn-primary" id="buddy-ask-btn" style="white-space: nowrap;">Ask</button>
                        </div>
                    </div>

                    <!-- Visibility -->
                    <div>
                        <div class="debug-section-title">Visibility</div>
                        <div class="debug-btn-grid grid-2">
                            <button class="debug-btn" id="debug-btn-show">Show</button>
                            <button class="debug-btn" id="debug-btn-hide">Hide</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
            this.debugPanelElement = panel;

            // Toggle Minimize / Maximize
            const header = panel.querySelector('#debug-panel-header');
            const toggleBtn = panel.querySelector('#debug-toggle-btn');
            const toggleHandler = (e) => {
                if (e.target === toggleBtn || e.currentTarget === header) {
                    panel.classList.toggle('minimized');
                    toggleBtn.textContent = panel.classList.contains('minimized') ? '+' : '_';
                }
            };
            header.addEventListener('click', toggleHandler);

            // =========================================================================
            // Step 7 Memory Buttons Binding
            // =========================================================================
            panel.querySelector('#btn-mem-foodie').addEventListener('click', () => {
                this.memory.preferences.setTravelStyle('foodie');
                this.emit('OBSERVATION_GENERATED', {
                    type: 'PREFERENCE_MATCH',
                    severity: 'important',
                    data: { preference: 'authentic local bakeries and foodie spots' }
                });
            });

            panel.querySelector('#btn-mem-adventure').addEventListener('click', () => {
                this.memory.preferences.setTravelStyle('adventure');
                this.emit('OBSERVATION_GENERATED', {
                    type: 'PREFERENCE_MATCH',
                    severity: 'important',
                    data: { preference: 'hiking trails and outdoor adventures' }
                });
            });

            panel.querySelector('#btn-mem-veg').addEventListener('click', () => {
                const cur = this.memory.preferences.get().dietary;
                const next = cur === 'vegetarian' ? 'none' : 'vegetarian';
                this.memory.preferences.setDietary(next);
            });

            panel.querySelector('#btn-mem-save-place').addEventListener('click', () => {
                this.memory.trips.savePlace({
                    id: 'eiffel_tower',
                    name: 'Eiffel Tower',
                    category: 'landmark',
                    location: 'Champ de Mars',
                    isOutdoor: true
                }, 'Must see sunset view!');
            });

            panel.querySelector('#btn-mem-near-saved').addEventListener('click', () => {
                this.emit('OBSERVATION_GENERATED', {
                    type: 'SAVED_PLACE_NEARBY',
                    severity: 'important',
                    data: { placeName: 'Eiffel Tower' }
                });
            });

            panel.querySelector('#btn-mem-clear').addEventListener('click', () => {
                this.memory.clearAll();
            });

            // Voice & UI Controls
            panel.querySelector('#btn-voice-listen').addEventListener('click', () => this.startListening());
            panel.querySelector('#btn-voice-stop-listen').addEventListener('click', () => this.stopListening());
            panel.querySelector('#btn-voice-test-tts').addEventListener('click', () => {
                const text = panel.querySelector('#buddy-ask-input').value.trim() || 'Yay! I remember your favorite travel spots! 🎒✨';
                this.testTTS(text, 'excited');
            });
            panel.querySelector('#btn-voice-stop-speak').addEventListener('click', () => this.stopSpeaking());

            panel.querySelector('#debug-btn-show').addEventListener('click', () => this.show());
            panel.querySelector('#debug-btn-hide').addEventListener('click', () => this.hide());

            const askInput = panel.querySelector('#buddy-ask-input');
            const askBtn = panel.querySelector('#buddy-ask-btn');
            const handleAsk = () => {
                const query = askInput.value.trim();
                if (query) {
                    this.ask(query);
                }
            };
            askBtn.addEventListener('click', handleAsk);
            askInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleAsk();
            });

            // Reactive UI Monitors
            this.memory.preferences.onChange((p) => {
                const stEl = panel.querySelector('#db-mem-style');
                const dietEl = panel.querySelector('#db-mem-diet');
                const paceEl = panel.querySelector('#db-mem-pace');
                if (stEl) stEl.textContent = p.travelStyle.toUpperCase();
                if (dietEl) dietEl.textContent = p.dietary;
                if (paceEl) paceEl.textContent = p.pacing;
            });

            this.memory.trips.onChange((saved) => {
                const savEl = panel.querySelector('#db-mem-saved');
                if (savEl) savEl.textContent = `${saved.length} saved`;
            });

            if (this.behavior) {
                this.behavior.onChange((state) => {
                    const emoEl = panel.querySelector('#db-b-emotion');
                    if (emoEl) emoEl.textContent = `${state.emotion.emotion.toUpperCase()} (${state.emotion.intensity.toFixed(2)}) / ${state.attention}`;
                });
            }

            if (this.ai) {
                this.ai.onAIUpdate((update) => {
                    const obsEl = panel.querySelector('#db-b-obs');
                    const msgEl = panel.querySelector('#db-b-msg');

                    if (obsEl) obsEl.textContent = update.lastObservation ? `[${update.lastObservation.type}]` : 'None';
                    if (update.decision && msgEl) msgEl.textContent = `"${update.decision.message}"`;
                });
            }
        }

        // =========================================================================
        // Public API Facade
        // =========================================================================

        show() {
            this.controller?.show();
        }

        hide() {
            this.controller?.hide();
        }

        toggle() {
            this.controller?.toggle();
        }

        play(animName, duration) {
            return this.controller?.play(animName, duration);
        }

        lookAt(target = 'USER', priority = 1, duration = 0) {
            return this.behavior?.lookAt(target, priority, duration);
        }

        setEmotion(emotion = 'neutral', intensity = 0.6) {
            this.behavior?.setEmotion(emotion, intensity);
            this.controller?.setEmotion(emotion);
        }

        playGesture(gesture = 'wave', duration = 2000) {
            return this.behavior?.playGesture(gesture, duration);
        }

        savePlace(place, note = '') {
            this.memory.trips.savePlace(place, note);
        }

        removeSavedPlace(placeId) {
            this.memory.trips.removeSavedPlace(placeId);
        }

        getSavedPlaces() {
            return this.memory.trips.getSavedPlaces();
        }

        setTravelStyle(style) {
            this.memory.preferences.setTravelStyle(style);
        }

        setDietary(dietary) {
            this.memory.preferences.setDietary(dietary);
        }

        getPreferences() {
            return this.memory.preferences.get();
        }

        clearMemory() {
            this.memory.clearAll();
        }

        setSpeaking(isSpeaking) {
            this.controller?.setSpeaking(isSpeaking);
        }

        say(text, duration = 3000) {
            this.controller?.say(text, duration);
        }

        startListening() {
            this.voice?.startListening();
        }

        stopListening() {
            this.voice?.stopListening();
        }

        stopSpeaking() {
            this.voice?.stopSpeaking();
        }

        speak(text, emotion = 'happy') {
            this.voice?.speakDecision({
                message: text,
                emotion: emotion,
                animation: 'happy',
                duration: 4000
            });
        }

        testTTS(text, emotion = 'happy') {
            this.voice?.testTTS(text, emotion);
        }

        async ask(question) {
            if (this.ai) {
                const decision = await this.ai.askBuddy(question);
                if (decision) {
                    this.behavior?.handleAIDecision(decision);
                    if (decision.message) {
                        this.memory.conversation.recordTurn(question, decision.message, decision.intent);
                    }
                    if (decision.message && this.voice) {
                        this.voice.speakDecision(decision);
                    }
                }
                return decision;
            }
            return null;
        }

        updateContext(partialContext) {
            this.context.update(partialContext);
        }

        getContext() {
            return this.context.get();
        }

        getState() {
            return this.controller?.getState() || {};
        }

        getBehaviorState() {
            return this.behavior?.getState() || {};
        }

        getVoiceState() {
            return this.voice?.getState() || 'idle';
        }

        emit(eventName, data) {
            this.events.emit(eventName, data);
        }

        destroy() {
            for (const unsub of this.unsubscribeEvents) {
                unsub();
            }
            this.unsubscribeEvents = [];
            this.behavior?.destroy();
            this.voice?.destroy();
            this.controller?.destroy();
            this.scene?.destroy();
            if (this.debugPanelElement) {
                this.debugPanelElement.remove();
            }
            this.isInitialized = false;
        }
    }

    global.TravelBuddy = TravelBuddy;

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!global.travelBuddy) {
                global.travelBuddy = new TravelBuddy();
                global.travelBuddy.init();
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TravelBuddy;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
