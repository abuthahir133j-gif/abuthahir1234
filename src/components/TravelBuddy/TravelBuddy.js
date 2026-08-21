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

    const _PointAction = (typeof global.PointAction !== 'undefined')
        ? global.PointAction
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/PointAction') : null);

    const _GazeController = (typeof global.GazeController !== 'undefined')
        ? global.GazeController
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/GazeController') : null);

    const _GazePoseCalculator = (typeof global.GazePoseCalculator !== 'undefined')
        ? global.GazePoseCalculator
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/GazePoseCalculator') : null);

    const _BuddyFaceController = (typeof global.BuddyFaceController !== 'undefined')
        ? global.BuddyFaceController
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/BuddyFaceController').BuddyFaceController : null);

    const _FacePoseCalculator = (typeof global.FacePoseCalculator !== 'undefined')
        ? global.FacePoseCalculator
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/FacePoseCalculator').FacePoseCalculator : null);

    const _BuddyReactionManager = (typeof global.BuddyReactionManager !== 'undefined')
        ? global.BuddyReactionManager
        : (typeof require !== 'undefined' ? require('../../character/buddy/reactions/BuddyReactionManager').BuddyReactionManager : null);

    const _BuddyEventDetector = (typeof global.BuddyEventDetector !== 'undefined')
        ? global.BuddyEventDetector
        : (typeof require !== 'undefined' ? require('../../character/buddy/reactions/BuddyEventDetector').BuddyEventDetector : null);

    const _BUDDY_REACTION_CONFIG = (typeof global.BUDDY_REACTION_CONFIG !== 'undefined')
        ? global.BUDDY_REACTION_CONFIG
        : (typeof require !== 'undefined' ? require('../../character/buddy/reactions/BuddyReactionConfig').BUDDY_REACTION_CONFIG : null);

    const _MomoController = (typeof global.MomoController !== 'undefined')
        ? global.MomoController
        : (typeof require !== 'undefined' ? require('../../character/buddy/MomoController').MomoController : null);

    const _GreetingAction = (typeof global.GreetingAction !== 'undefined')
        ? global.GreetingAction
        : (typeof require !== 'undefined' ? require('../../character/buddy/actions/GreetingAction') : null);

    const _MomoSpeech = (typeof global.MomoSpeech !== 'undefined')
        ? global.MomoSpeech
        : (typeof require !== 'undefined' ? require('../../voice/buddy/MomoSpeech').MomoSpeech : null);

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
            this.pointAction = null;
            this.gazeController = null;
            this.face = null;
            this.reactionManager = null;
            this.eventDetector = null;
            this.debugPanelElement = null;
            this.momo = null;

            this.unsubscribeEvents = [];
            this.isInitialized = false;
        }

        async init(targetContainer = document.body) {
            if (this.isInitialized) return this;

            // 1. Initialize Scene Viewport & Rig Controller & Animation Engine
            this.scene = new _BuddyScene(targetContainer, this.config, this.animationManager);
            await this.scene.mount();
            this.rig = this.scene.rig;
            this.anim = this.scene.animationEngine;
            this.pointAction = _PointAction && this.anim ? new _PointAction(this.anim, { debug: this.config.debug?.enabled }) : null;
            this.gazeController = _GazeController && this.anim ? new _GazeController(this.anim, { debug: this.config.debug?.enabled }) : null;
            this.face = _BuddyFaceController && this.anim ? new _BuddyFaceController(this.anim, this.rig) : null;
            if (this.face && typeof global !== 'undefined') {
                global.buddyFace = this.face;
            }

            // Step 6 Reaction Manager & Event Detector
            this.reactionManager = _BuddyReactionManager ? new _BuddyReactionManager({
                gazeController: this.gazeController,
                pointAction: this.pointAction,
                faceController: this.face,
                animationEngine: this.anim,
                rig: this.rig
            }, this.config.reactionsConfig || {}) : null;

            if (this.reactionManager && typeof global !== 'undefined') {
                global.buddyReaction = this.reactionManager;
            }

            this.eventDetector = _BuddyEventDetector && this.reactionManager ? new _BuddyEventDetector(this.reactionManager) : null;
            if (this.eventDetector && typeof document !== 'undefined') {
                this.eventDetector.attach(document.body);
            }

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

            // 7. Initialize Momo Animation Controller & Wire Components
            this.momo = (typeof global.momoController !== 'undefined')
                ? global.momoController
                : (_MomoController ? new _MomoController({ events: this.events }) : null);

            if (this.momo) {
                this.momo.attachComponents({
                    animationEngine: this.anim,
                    rig: this.rig,
                    scene: this.scene,
                    gazeController: this.gazeController,
                    faceController: this.face,
                    speech: global.momoSpeech
                });
                global.momoController = this.momo;
            }

            // 8. Connect Event Bus -> Proactive AI Brain & Behavior Engine
            this.bindEventBus();

            // 9. Mount Developer Debug Panel
            if (this.config.debug?.enabled) {
                this.mountDebugPanel();
            } else {
                this.removeDebugElements();
            }

            // 10. Check for initial post-login greeting trigger
            this.checkLoginGreeting();

            this.isInitialized = true;
            console.log('[TravelBuddy] Step 7 Persistent Trip Memory & Personalization Initialized. Accessible via window.travelBuddy');
            return this;
        }

        removeDebugElements() {
            if (typeof document === 'undefined') return;
            const idsToRemove = [
                'buddy-debug-panel',
                'point-test-target',
                'gaze-test-target',
                'buddy-skeleton-overlay',
                'buddy-gaze-point'
            ];
            for (const id of idsToRemove) {
                const el = document.getElementById(id);
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }
            const extraElements = document.querySelectorAll('.buddy-gaze-point, .buddy-gaze-test-target, .buddy-debug-panel');
            for (const el of extraElements) {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }
        }

        checkLoginGreeting() {
            if (typeof sessionStorage === 'undefined') return;
            const justLoggedIn = sessionStorage.getItem("language_lab_just_logged_in") === "true";
            const loginEventRaw = sessionStorage.getItem("language_lab_login_event");

            if (justLoggedIn || loginEventRaw) {
                sessionStorage.removeItem("language_lab_just_logged_in");
                sessionStorage.removeItem("language_lab_login_event");

                let studentId = null;
                if (loginEventRaw) {
                    try {
                        const parsed = JSON.parse(loginEventRaw);
                        studentId = parsed.studentId || null;
                    } catch (e) {}
                }
                if (!studentId && typeof localStorage !== 'undefined') {
                    studentId = localStorage.getItem("language_lab_student_id_v1") || localStorage.getItem("language_lab_student_id") || "Student";
                }

                // Short delay to allow layout mount before starting coordinated greeting
                setTimeout(() => {
                    if (this.events) {
                        this.events.emit('LOGIN_SUCCESS', {
                            type: 'LOGIN_SUCCESS',
                            studentId: studentId || 'Student'
                        });
                    } else if (this.momo) {
                        this.momo.handleLoginSuccess({
                            type: 'LOGIN_SUCCESS',
                            studentId: studentId || 'Student'
                        });
                    }
                }, 400);
            }
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
                    <span class="debug-title">🤖 TRAVEL BUDDY MEMORY & RIG</span>
                    <button class="debug-toggle-btn" id="debug-toggle-btn" title="Minimize / Expand">_</button>
                </div>
                <div class="debug-body">
                    <!-- Character Asset & Lock Status (Requirement 12 & 13) -->
                    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #34D399; font-weight: bold; margin-bottom: 4px;">🔒 CHARACTER ASSET LOCK</div>
                        <div class="debug-state-box" id="debug-asset-lock-box" style="font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">BUDDY ASSET:</span> <span class="state-val" id="db-char-asset" style="color: #6EE7B7; font-weight: bold;">AI/png.svg</span></div>
                            <div class="debug-state-row"><span class="state-key">CHARACTER SOURCE:</span> <span class="state-val" style="color: #34D399; font-weight: bold;">LOCKED</span></div>
                            <div class="debug-state-row"><span class="state-key">CHARACTER SWAP:</span> <span class="state-val" style="color: #F87171; font-weight: bold;">DISABLED</span></div>
                            <div class="debug-state-row"><span class="state-key">CURRENT ACTION:</span> <span class="state-val" id="db-rig-current-action" style="color: #FCD34D;">IDLE</span></div>
                            <div class="debug-state-row"><span class="state-key">CURRENT PART:</span> <span class="state-val" id="db-rig-current-part" style="color: #38BDF8;">NONE</span></div>
                        </div>
                    <!-- Momo AI Buddy Login Greeting Section -->
                    <div style="background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(244, 114, 182, 0.35); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #F472B6; font-weight: bold; margin-bottom: 6px;">👋 MOMO AI BUDDY GREETING</div>
                        <div class="debug-state-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">BUDDY NAME:</span> <span class="state-val" style="color: #F472B6; font-weight: bold;">Momo</span></div>
                            <div class="debug-state-row"><span class="state-key">GREETING STATE:</span> <span class="state-val" id="db-momo-state" style="color: #34D399; font-weight: bold;">IDLE</span></div>
                            <div class="debug-state-row"><span class="state-key">SPEECH TEXT:</span> <span class="state-val" style="color: #FCD34D;">"Hi, I am Momo, let's see today's adventure!"</span></div>
                        </div>
                        <button class="debug-btn" id="btn-test-momo-greeting" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; font-weight: bold; width: 100%; padding: 8px; border-radius: 6px; border: none; cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">[ TEST MOMO GREETING ]</button>
                    </div>

                    <!-- Step 2: Buddy Animation Engine Debug Panel (Requirement 18 & 19) -->
                    <div style="background: rgba(147, 51, 234, 0.08); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #C084FC; font-weight: bold; margin-bottom: 6px;">🎬 STEP 2: BUDDY ANIMATION ENGINE</div>
                        
                        <!-- Engine State Monitor -->
                        <div class="debug-state-box" id="debug-anim-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">Current Animation:</span> <span class="state-val" id="db-anim-name" style="color: #FCD34D;">IDLE</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Priority:</span> <span class="state-val" id="db-anim-priority" style="color: #38BDF8;">IDLE (1)</span></div>
                            <div class="debug-state-row"><span class="state-key">Locked Parts:</span> <span class="state-val" id="db-anim-locked">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Active Parts:</span> <span class="state-val" id="db-anim-active">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Head Rot:</span> <span class="state-val" id="db-anim-head-rot">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Right Arm Rot:</span> <span class="state-val" id="db-anim-rarm-rot">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Left Arm Rot:</span> <span class="state-val" id="db-anim-larm-rot">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">Animation Queue:</span> <span class="state-val" id="db-anim-queue">0</span></div>
                        </div>

                        <!-- Step 2 Required Test Buttons -->
                        <div class="debug-btn-grid grid-2" style="margin-bottom: 6px;">
                            <button class="debug-btn btn-primary" id="btn-anim-test-head" style="background: #7c3aed;">[ TEST HEAD ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-eyes" style="background: #7c3aed;">[ TEST EYES ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-rarm" style="background: #6366f1;">[ TEST RIGHT ARM ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-larm" style="background: #6366f1;">[ TEST LEFT ARM ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-rforearm" style="background: #0284c7;">[ TEST RIGHT FOREARM ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-rhand" style="background: #0284c7;">[ TEST RIGHT HAND ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-parallel" style="background: #059669;">[ TEST PARALLEL ]</button>
                            <button class="debug-btn btn-primary" id="btn-anim-test-sequence" style="background: #d97706;">[ TEST SEQUENCE ]</button>
                            <button class="debug-btn" id="btn-anim-reset-all" style="background: #dc2626; color: #fff; font-weight: bold; grid-column: span 2;">[ RESET ALL ]</button>
                        </div>
                    </div>

                    <!-- Step 3: Natural Pointing Action (Requirement 22 & 24) -->
                    <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #38BDF8; font-weight: bold; margin-bottom: 6px;">👉 STEP 3: NATURAL POINT ACTION</div>
                        
                        <!-- Point Telemetry Monitor -->
                        <div class="debug-state-box" id="debug-point-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">CURRENT ACTION:</span> <span class="state-val" id="db-pt-action" style="color: #FCD34D;">IDLE</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET:</span> <span class="state-val" id="db-pt-target">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET X / Y:</span> <span class="state-val" id="db-pt-coords">0px, 0px</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET ANGLE:</span> <span class="state-val" id="db-pt-angle">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">HEAD ANGLE:</span> <span class="state-val" id="db-pt-head">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">ACTIVE ARM:</span> <span class="state-val" id="db-pt-arm" style="color: #38BDF8;">RIGHT</span></div>
                            <div class="debug-state-row"><span class="state-key">ELBOW ANGLE:</span> <span class="state-val" id="db-pt-elbow">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">WRIST ANGLE:</span> <span class="state-val" id="db-pt-wrist">0°</span></div>
                            <div class="debug-state-row"><span class="state-key">LOCKED PARTS:</span> <span class="state-val" id="db-pt-locked">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">ACTION PROGRESS:</span> <span class="state-val" id="db-pt-progress" style="color: #4ADE80;">IDLE</span></div>
                        </div>

                        <!-- Step 3 Interactive Test Buttons -->
                        <div class="debug-btn-grid grid-2" style="margin-bottom: 6px;">
                            <button class="debug-btn btn-primary" id="btn-pt-test-left" style="background: #0284c7;">[ TEST POINT LEFT ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-test-right" style="background: #0284c7;">[ TEST POINT RIGHT ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-test-up" style="background: #0369a1;">[ TEST POINT UP ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-test-down" style="background: #0369a1;">[ TEST POINT DOWN ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-test-target" style="background: #059669; grid-column: span 2;">[ POINT TO TEST TARGET ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-move-target" style="background: #d97706;">[ MOVE TEST TARGET ]</button>
                            <button class="debug-btn" id="btn-pt-reset" style="background: #dc2626; color: #fff; font-weight: bold;">[ RESET ]</button>
                        </div>

                        <!-- Hierarchical Arm Chain Kinematic Tests (Requirement 11 & 12) -->
                        <div class="debug-section-title" style="color: #94A3B8; font-size: 9px; margin-top: 4px; margin-bottom: 4px;">🔗 CONNECTED ARM CHAIN TESTS</div>
                        <div class="debug-btn-grid grid-2">
                            <button class="debug-btn btn-primary" id="btn-pt-chain-shoulder" style="background: #475569;">[ TEST SHOULDER ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-chain-elbow" style="background: #475569;">[ TEST ELBOW ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-chain-wrist" style="background: #475569;">[ TEST WRIST ]</button>
                            <button class="debug-btn btn-primary" id="btn-pt-toggle-skeleton" style="background: #0891b2;">[ SKELETON ON/OFF ]</button>
                        </div>
                    </div>

                    <!-- Step 4: Look / Gaze System (Requirement 11, 12 & 13) -->
                    <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #C084FC; font-weight: bold; margin-bottom: 6px;">👀 STEP 4: LOOK / GAZE SYSTEM</div>
                        
                        <!-- Gaze Telemetry Monitor -->
                        <div class="debug-state-box" id="debug-gaze-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">CURRENT GAZE:</span> <span class="state-val" id="db-gaze-action" style="color: #FCD34D;">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET:</span> <span class="state-val" id="db-gaze-target">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET X:</span> <span class="state-val" id="db-gaze-tx">0px</span></div>
                            <div class="debug-state-row"><span class="state-key">TARGET Y:</span> <span class="state-val" id="db-gaze-ty">0px</span></div>
                            <div class="debug-state-row"><span class="state-key">EYE X:</span> <span class="state-val" id="db-gaze-eyex" style="color: #38BDF8;">0px</span></div>
                            <div class="debug-state-row"><span class="state-key">EYE Y:</span> <span class="state-val" id="db-gaze-eyey" style="color: #38BDF8;">0px</span></div>
                            <div class="debug-state-row"><span class="state-key">HEAD ROTATION:</span> <span class="state-val" id="db-gaze-headrot" style="color: #4ADE80;">0°</span></div>
                        </div>

                        <!-- Step 4 Interactive Test Buttons -->
                        <div class="debug-btn-grid grid-2" style="margin-bottom: 6px;">
                            <button class="debug-btn btn-primary" id="btn-gaze-left" style="background: #9333ea;">[ LOOK LEFT ]</button>
                            <button class="debug-btn btn-primary" id="btn-gaze-right" style="background: #9333ea;">[ LOOK RIGHT ]</button>
                            <button class="debug-btn btn-primary" id="btn-gaze-up" style="background: #7e22ce;">[ LOOK UP ]</button>
                            <button class="debug-btn btn-primary" id="btn-gaze-down" style="background: #7e22ce;">[ LOOK DOWN ]</button>
                            <button class="debug-btn btn-primary" id="btn-gaze-center" style="background: #6b21a8; grid-column: span 2;">[ LOOK CENTER ]</button>
                            <button class="debug-btn btn-primary" id="btn-gaze-test-target" style="background: #059669; grid-column: span 2;">[ LOOK AT TEST ELEMENT ]</button>
                            <button class="debug-btn" id="btn-gaze-clear" style="background: #dc2626; color: #fff; font-weight: bold; grid-column: span 2;">[ CLEAR GAZE ]</button>
                        </div>
                    </div>

                    <!-- Facial Reaction & Emotion System (Step 5) -->
                    <div style="background: rgba(244, 114, 182, 0.08); border: 1px solid rgba(244, 114, 182, 0.35); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #F472B6; font-weight: bold; margin-bottom: 6px;">😊 FACIAL DEBUG (Step 5)</div>
                        
                        <!-- Facial Telemetry Monitor -->
                        <div class="debug-state-box" id="debug-face-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">Current Emotion:</span> <span class="state-val" id="db-face-emotion" style="color: #F472B6; font-weight: bold;">NEUTRAL</span></div>
                            <div class="debug-state-row"><span class="state-key">Blink:</span> <span class="state-val" id="db-face-blink" style="color: #38BDF8;">READY</span></div>
                            <div class="debug-state-row"><span class="state-key">Eye State:</span> <span class="state-val" id="db-face-eyes">OPEN</span></div>
                            <div class="debug-state-row"><span class="state-key">Eyebrow State:</span> <span class="state-val" id="db-face-eyebrows" style="color: #94A3B8;">UNAVAILABLE</span></div>
                            <div class="debug-state-row"><span class="state-key">Mouth State:</span> <span class="state-val" id="db-face-mouth">NEUTRAL</span></div>
                        </div>

                        <!-- Step 5 Interactive Test Buttons -->
                        <div class="debug-btn-grid grid-2" style="margin-bottom: 6px;">
                            <button class="debug-btn btn-primary" id="btn-face-neutral" style="background: #475569;">[ NEUTRAL ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-happy" style="background: #ec4899;">[ HAPPY ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-surprised" style="background: #f59e0b;">[ SURPRISED ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-thinking" style="background: #3b82f6;">[ THINKING ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-confused" style="background: #8b5cf6;">[ CONFUSED ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-sad" style="background: #64748b;">[ SAD ]</button>
                            <button class="debug-btn btn-primary" id="btn-face-blink" style="background: #06b6d4; font-weight: bold; grid-column: span 2;">[ BLINK ]</button>
                            <button class="debug-btn" id="btn-face-reset" style="background: #dc2626; color: #fff; font-weight: bold; grid-column: span 2;">[ RESET FACE ]</button>
                        </div>
                    </div>

                    <!-- Browser Event Reaction System (Step 6) -->
                    <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.35); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                        <div class="debug-section-title" style="color: #38BDF8; font-weight: bold; margin-bottom: 6px;">⚡ BUDDY REACTION DEBUG (Step 6)</div>
                        
                        <!-- Reaction Telemetry Monitor -->
                        <div class="debug-state-box" id="debug-reaction-box" style="margin-bottom: 6px; font-size: 10px;">
                            <div class="debug-state-row"><span class="state-key">Current Event:</span> <span class="state-val" id="db-rx-event" style="color: #FCD34D;">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Reaction:</span> <span class="state-val" id="db-rx-reaction" style="color: #38BDF8;">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Target:</span> <span class="state-val" id="db-rx-target">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Priority:</span> <span class="state-val" id="db-rx-priority">NONE</span></div>
                            <div class="debug-state-row"><span class="state-key">Cooldown:</span> <span class="state-val" id="db-rx-cooldown" style="color: #4ADE80;">READY</span></div>
                            <div class="debug-state-row"><span class="state-key">Queue:</span> <span class="state-val" id="db-rx-queue">EMPTY</span></div>
                            <div class="debug-state-row" style="margin-top: 2px;"><span class="state-key">Last Event:</span></div>
                            <div id="db-rx-last-log" style="color: #9EFAFF; font-size: 10px; font-style: italic; margin-top: 1px; word-break: break-all;">NONE</div>
                        </div>

                        <!-- Step 6 Interactive Test Buttons -->
                        <div class="debug-btn-grid grid-2" style="margin-bottom: 6px;">
                            <button class="debug-btn btn-primary" id="btn-rx-hover" style="background: #0284c7;">[ TEST HOVER ]</button>
                            <button class="debug-btn btn-primary" id="btn-rx-click" style="background: #0369a1;">[ TEST CLICK ]</button>
                            <button class="debug-btn btn-primary" id="btn-rx-success" style="background: #10b981;">[ TEST SUCCESS ]</button>
                            <button class="debug-btn btn-primary" id="btn-rx-error" style="background: #ef4444;">[ TEST ERROR ]</button>
                            <button class="debug-btn btn-primary" id="btn-rx-visible" style="background: #8b5cf6;">[ TEST TARGET VISIBLE ]</button>
                            <button class="debug-btn btn-primary" id="btn-rx-hidden" style="background: #64748b;">[ TEST TARGET HIDDEN ]</button>
                            <button class="debug-btn" id="btn-rx-reset" style="background: #dc2626; color: #fff; font-weight: bold; grid-column: span 2;">[ RESET ]</button>
                        </div>
                    </div>

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

                    <!-- Character Behavior & AI State Monitor (Step 5) -->
                    <div>
                        <div class="debug-section-title">Character Behavior Debug (Step 5)</div>
                        <div class="debug-state-box" id="debug-behavior-box">
                            <div class="debug-state-row"><span class="state-key">Current State:</span> <span class="state-val" id="db-b-state" style="color: #4ADE80;">IDLE</span></div>
                            <div class="debug-state-row"><span class="state-key">Emotion / Intensity:</span> <span class="state-val" id="db-b-emotion">${bState.emotion.emotion.toUpperCase()} (${bState.emotion.intensity.toFixed(2)})</span></div>
                            <div class="debug-state-row"><span class="state-key">Attention Target:</span> <span class="state-val" id="db-b-attention" style="color: #38BDF8;">${bState.attention}</span></div>
                            <div class="debug-state-row"><span class="state-key">Current Gesture:</span> <span class="state-val" id="db-b-gesture">${bState.gesture.toUpperCase()}</span></div>
                            <div class="debug-state-row"><span class="state-key">Action Sequence / Queue:</span> <span class="state-val" id="db-b-sequence">NONE (0 queued)</span></div>
                            <div class="debug-state-row"><span class="state-key">Last Intent:</span> <span class="state-val" id="db-b-intent" style="color: #FCD34D;">${bState.lastIntent.toUpperCase()}</span></div>
                            <div class="debug-state-row" style="margin-top: 4px;"><span class="state-key">Message:</span></div>
                            <div id="db-b-msg" style="color: #9EFAFF; font-size: 11px; font-style: italic; margin-top: 2px; word-break: break-word;">"Character behavior engine online!"</div>
                        </div>
                    </div>

                    <!-- Step 5 Character Behavior Test Actions -->
                    <div>
                        <div class="debug-section-title">Character Behavior Tests (Step 5)</div>
                        <div class="debug-btn-grid grid-2">
                            <button class="debug-btn btn-primary" id="btn-bh-happy">😊 Test Happy</button>
                            <button class="debug-btn btn-primary" id="btn-bh-surprise">😲 Test Surprise</button>
                            <button class="debug-btn btn-primary" id="btn-bh-look-user">👀 Test Look At User</button>
                            <button class="debug-btn btn-primary" id="btn-bh-point">👉 Test Point</button>
                            <button class="debug-btn btn-primary" id="btn-bh-warning">⚠️ Test Warning</button>
                            <button class="debug-btn btn-primary" id="btn-bh-celebrate">🎉 Test Celebration</button>
                            <button class="debug-btn" id="btn-bh-idle">💤 Test Idle</button>
                            <button class="debug-btn" id="btn-bh-silence">🤫 Test Silence</button>
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
            // Momo AI Buddy Login Greeting Test Button Binding & State Observer
            // =========================================================================
            const momoStateLabel = panel.querySelector('#db-momo-state');
            if (this.momo && momoStateLabel) {
                this.momo.onStateChange((state) => {
                    momoStateLabel.textContent = state;
                    if (state === 'GREETING') {
                        momoStateLabel.style.color = '#F472B6';
                    } else if (state === 'COMPLETED') {
                        momoStateLabel.style.color = '#60A5FA';
                    } else {
                        momoStateLabel.style.color = '#34D399';
                    }
                });
            }

            panel.querySelector('#btn-test-momo-greeting')?.addEventListener('click', () => {
                if (this.momo) {
                    this.momo.triggerTestGreeting();
                } else if (global.momoController) {
                    global.momoController.triggerTestGreeting();
                }
            });

            // =========================================================================
            // Step 2 Buddy Animation Engine Test Buttons Binding
            // =========================================================================
            const actLabel = panel.querySelector('#db-rig-current-action');
            const partLabel = panel.querySelector('#db-rig-current-part');

            // [ TEST HEAD ]: Smoothly rotate head to 22° and back to 0°
            panel.querySelector('#btn-anim-test-head')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_HEAD_KINEMATICS';
                if (partLabel) partLabel.textContent = 'buddy-head';
                this.anim?.animate('head', { rotation: 22 }, { duration: 350, easing: 'easeOut' })
                    .then(() => new Promise(r => setTimeout(r, 100)))
                    .then(() => this.anim?.animate('head', { rotation: 0 }, { duration: 300, easing: 'easeInOut' }))
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // [ TEST EYES ]: Smoothly pan gaze left then right then neutral
            panel.querySelector('#btn-anim-test-eyes')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_EYE_GAZE';
                if (partLabel) partLabel.textContent = 'buddy-left-eye / buddy-right-eye';
                this.anim?.parallel([
                    { part: 'leftEye', properties: { x: -8, y: -4 }, duration: 250, easing: 'easeOut' },
                    { part: 'rightEye', properties: { x: -8, y: -4 }, duration: 250, easing: 'easeOut' }
                ]).then(() => new Promise(r => setTimeout(r, 120)))
                  .then(() => this.anim?.parallel([
                      { part: 'leftEye', properties: { x: 8, y: -4 }, duration: 300, easing: 'easeInOut' },
                      { part: 'rightEye', properties: { x: 8, y: -4 }, duration: 300, easing: 'easeInOut' }
                  ]))
                  .then(() => new Promise(r => setTimeout(r, 120)))
                  .then(() => this.anim?.parallel([
                      { part: 'leftEye', properties: { x: 0, y: 0 }, duration: 250, easing: 'easeOut' },
                      { part: 'rightEye', properties: { x: 0, y: 0 }, duration: 250, easing: 'easeOut' }
                  ]))
                  .then(() => {
                      if (actLabel) actLabel.textContent = 'IDLE';
                      if (partLabel) partLabel.textContent = 'NONE';
                  });
            });

            // [ TEST RIGHT ARM ]: Smoothly elevate upper arm around shoulder pivot and return
            panel.querySelector('#btn-anim-test-rarm')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_RIGHT_ARM';
                if (partLabel) partLabel.textContent = 'buddy-right-upper-arm';
                this.anim?.animate('right-upper-arm', { rotation: -40 }, { duration: 400, easing: 'easeOutBack' })
                    .then(() => new Promise(r => setTimeout(r, 150)))
                    .then(() => this.anim?.animate('right-upper-arm', { rotation: 0 }, { duration: 350, easing: 'easeInOut' }))
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // [ TEST LEFT ARM ]: Smoothly elevate left upper arm around shoulder pivot and return
            panel.querySelector('#btn-anim-test-larm')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_LEFT_ARM';
                if (partLabel) partLabel.textContent = 'buddy-left-upper-arm';
                this.anim?.animate('left-upper-arm', { rotation: 40 }, { duration: 400, easing: 'easeOutBack' })
                    .then(() => new Promise(r => setTimeout(r, 150)))
                    .then(() => this.anim?.animate('left-upper-arm', { rotation: 0 }, { duration: 350, easing: 'easeInOut' }))
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // [ TEST RIGHT FOREARM ]: Smoothly flex forearm around elbow pivot and return
            panel.querySelector('#btn-anim-test-rforearm')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_RIGHT_FOREARM';
                if (partLabel) partLabel.textContent = 'buddy-right-forearm';
                this.anim?.animate('right-forearm', { rotation: -45 }, { duration: 350, easing: 'easeOut' })
                    .then(() => new Promise(r => setTimeout(r, 150)))
                    .then(() => this.anim?.animate('right-forearm', { rotation: 0 }, { duration: 300, easing: 'easeInOut' }))
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // [ TEST RIGHT HAND ]: Smoothly rotate hand around wrist pivot and return
            panel.querySelector('#btn-anim-test-rhand')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_RIGHT_HAND';
                if (partLabel) partLabel.textContent = 'buddy-right-hand';
                this.anim?.animate('right-hand', { rotation: -35 }, { duration: 300, easing: 'easeOut' })
                    .then(() => new Promise(r => setTimeout(r, 150)))
                    .then(() => this.anim?.animate('right-hand', { rotation: 0 }, { duration: 300, easing: 'easeInOut' }))
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // [ TEST PARALLEL ]: Head + Eyes + Right Arm animate simultaneously without conflict
            panel.querySelector('#btn-anim-test-parallel')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_PARALLEL_TRIO';
                if (partLabel) partLabel.textContent = 'head + eyes + rightArm';
                this.anim?.parallel([
                    { part: 'head', properties: { rotation: 16 }, duration: 400, easing: 'easeOut' },
                    { part: 'leftEye', properties: { x: 7, y: -3 }, duration: 300, easing: 'easeOut' },
                    { part: 'rightEye', properties: { x: 7, y: -3 }, duration: 300, easing: 'easeOut' },
                    { part: 'rightUpperArm', properties: { rotation: -32 }, duration: 450, easing: 'easeOutBack' },
                    { part: 'body', properties: { rotation: 6 }, duration: 400, easing: 'easeOut' }
                ]).then(() => new Promise(r => setTimeout(r, 300)))
                  .then(() => this.anim?.resetAll({ animated: true, duration: 400 }))
                  .then(() => {
                      if (actLabel) actLabel.textContent = 'IDLE';
                      if (partLabel) partLabel.textContent = 'NONE';
                  });
            });

            // [ TEST SEQUENCE ]: Eyes -> Head -> Upper Arm -> Forearm -> Hand
            panel.querySelector('#btn-anim-test-sequence')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'TEST_SEQUENCE_CASCADE';
                if (partLabel) partLabel.textContent = 'eyes -> head -> arm -> hand';
                this.anim?.sequence([
                    [
                        { part: 'leftEye', properties: { x: 8, y: -2 }, duration: 200, easing: 'easeOut' },
                        { part: 'rightEye', properties: { x: 8, y: -2 }, duration: 200, easing: 'easeOut' }
                    ],
                    { part: 'head', properties: { rotation: 18 }, duration: 280, easing: 'easeOut' },
                    { part: 'rightUpperArm', properties: { rotation: -38 }, duration: 320, easing: 'easeOutBack' },
                    { part: 'rightForearm', properties: { rotation: -28 }, duration: 240, easing: 'easeOut' },
                    { part: 'rightHand', properties: { rotation: -22 }, duration: 200, easing: 'easeOut' }
                ]).then(() => new Promise(r => setTimeout(r, 400)))
                  .then(() => this.anim?.resetAll({ animated: true, duration: 450 }))
                  .then(() => {
                      if (actLabel) actLabel.textContent = 'IDLE';
                      if (partLabel) partLabel.textContent = 'NONE';
                  });
            });

            // [ RESET ALL ]: Instant / Animated Return to baseline neutral pose
            panel.querySelector('#btn-anim-reset-all')?.addEventListener('click', () => {
                if (actLabel) actLabel.textContent = 'RESET_ALL';
                if (partLabel) partLabel.textContent = 'ALL_PARTS';
                this.anim?.resetAll({ animated: true, duration: 350 })
                    .then(() => {
                        if (actLabel) actLabel.textContent = 'IDLE';
                        if (partLabel) partLabel.textContent = 'NONE';
                    });
            });

            // =========================================================================
            // Step 3 Natural Point Action Buttons Binding
            // =========================================================================
            // Test Target Position States: [Top-Left, Top-Right, Center-Left, Mid-Top, Center]
            const targetPositions = [
                { top: '15%', left: '20%' },
                { top: '25%', left: '70%' },
                { top: '60%', left: '15%' },
                { top: '10%', left: '45%' },
                { top: '45%', left: '50%' }
            ];
            let currentTargetPosIdx = 0;

            const ensureTestTargetElement = () => {
                let el = document.getElementById('point-test-target');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'point-test-target';
                    el.className = 'buddy-point-test-target';
                    el.style.position = 'fixed';
                    el.style.top = targetPositions[0].top;
                    el.style.left = targetPositions[0].left;
                    el.style.padding = '8px 14px';
                    el.style.borderRadius = '10px';
                    el.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
                    el.style.color = '#FFFFFF';
                    el.style.fontWeight = 'bold';
                    el.style.fontSize = '12px';
                    el.style.boxShadow = '0 6px 18px rgba(2, 132, 199, 0.4)';
                    el.style.border = '2px solid #38BDF8';
                    el.style.zIndex = '99999';
                    el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    el.style.cursor = 'move';
                    el.innerHTML = '🎯 <span>TEST TARGET</span>';
                    document.body.appendChild(el);
                }
                return el;
            };

            panel.querySelector('#btn-pt-test-left')?.addEventListener('click', () => {
                this.pointAt({ type: 'position', x: 120, y: 320 });
            });

            panel.querySelector('#btn-pt-test-right')?.addEventListener('click', () => {
                const rX = typeof window !== 'undefined' ? window.innerWidth - 120 : 800;
                this.pointAt({ type: 'position', x: rX, y: 320 });
            });

            panel.querySelector('#btn-pt-test-up')?.addEventListener('click', () => {
                const uX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
                this.pointAt({ type: 'position', x: uX, y: 90 });
            });

            panel.querySelector('#btn-pt-test-down')?.addEventListener('click', () => {
                const dX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
                const dY = typeof window !== 'undefined' ? window.innerHeight - 90 : 700;
                this.pointAt({ type: 'position', x: dX, y: dY });
            });

            panel.querySelector('#btn-pt-test-target')?.addEventListener('click', () => {
                ensureTestTargetElement();
                this.pointAt({ type: 'element', targetId: 'point-test-target' });
            });

            panel.querySelector('#btn-pt-move-target')?.addEventListener('click', () => {
                const el = ensureTestTargetElement();
                currentTargetPosIdx = (currentTargetPosIdx + 1) % targetPositions.length;
                el.style.top = targetPositions[currentTargetPosIdx].top;
                el.style.left = targetPositions[currentTargetPosIdx].left;
                // Automatically re-point to the moved target
                this.pointAt({ type: 'element', targetId: 'point-test-target' });
            });

            panel.querySelector('#btn-pt-reset')?.addEventListener('click', () => {
                this.pointAction?.cancel();
            });

            // --- Connected Arm Chain Test Handlers ---
            let skeletonVisible = false;
            let skeletonSvg = null;

            const toggleSkeletonOverlay = () => {
                skeletonVisible = !skeletonVisible;
                if (!skeletonVisible) {
                    if (skeletonSvg && skeletonSvg.parentNode) skeletonSvg.parentNode.removeChild(skeletonSvg);
                    skeletonSvg = null;
                    return;
                }

                // Render debug skeleton lines over buddy SVG
                const buddyDom = document.getElementById('travel-buddy-root');
                if (!buddyDom) return;
                const rect = buddyDom.getBoundingClientRect();

                skeletonSvg = document.createElement('div');
                skeletonSvg.id = 'buddy-skeleton-overlay';
                skeletonSvg.style.position = 'fixed';
                skeletonSvg.style.left = `${rect.left}px`;
                skeletonSvg.style.top = `${rect.top}px`;
                skeletonSvg.style.width = `${rect.width}px`;
                skeletonSvg.style.height = `${rect.height}px`;
                skeletonSvg.style.pointerEvents = 'none';
                skeletonSvg.style.zIndex = '999998';
                skeletonSvg.innerHTML = `
                    <svg viewBox="0 0 672 1024" width="100%" height="100%" style="overflow: visible;">
                        <!-- Right Arm Bone Chain -->
                        <line x1="475" y1="520" x2="515" y2="625" stroke="#38BDF8" stroke-width="6" stroke-linecap="round"/>
                        <line x1="515" y1="625" x2="525" y2="725" stroke="#34D399" stroke-width="6" stroke-linecap="round"/>
                        <!-- Joints -->
                        <circle cx="475" cy="520" r="10" fill="#38BDF8" stroke="#FFF" stroke-width="2"/>
                        <text x="490" y="525" fill="#38BDF8" font-size="16" font-weight="bold">SHOULDER</text>
                        <circle cx="515" cy="625" r="9" fill="#34D399" stroke="#FFF" stroke-width="2"/>
                        <text x="530" y="630" fill="#34D399" font-size="16" font-weight="bold">ELBOW</text>
                        <circle cx="525" cy="725" r="8" fill="#F43F5E" stroke="#FFF" stroke-width="2"/>
                        <text x="540" y="730" fill="#F43F5E" font-size="16" font-weight="bold">WRIST</text>
                    </svg>
                `;
                document.body.appendChild(skeletonSvg);
            };

            // [ TEST SHOULDER ]: Rotates shoulder -> entire connected arm swings together
            panel.querySelector('#btn-pt-chain-shoulder')?.addEventListener('click', () => {
                this.anim?.animate('rightUpperArm', { rotation: -42 }, { duration: 400, easing: 'easeOutBack' })
                    .then(() => new Promise(r => setTimeout(r, 200)))
                    .then(() => this.anim?.animate('rightUpperArm', { rotation: 0 }, { duration: 350, easing: 'easeInOut' }));
            });

            // [ TEST ELBOW ]: Rotates forearm -> forearm and hand swing from elbow joint
            panel.querySelector('#btn-pt-chain-elbow')?.addEventListener('click', () => {
                this.anim?.animate('rightForearm', { rotation: -38 }, { duration: 350, easing: 'easeOutBack' })
                    .then(() => new Promise(r => setTimeout(r, 200)))
                    .then(() => this.anim?.animate('rightForearm', { rotation: 0 }, { duration: 300, easing: 'easeInOut' }));
            });

            // [ TEST WRIST ]: Rotates hand -> hand rotates from wrist joint
            panel.querySelector('#btn-pt-chain-wrist')?.addEventListener('click', () => {
                this.anim?.animate('rightHand', { rotation: -30 }, { duration: 300, easing: 'easeOut' })
                    .then(() => new Promise(r => setTimeout(r, 200)))
                    .then(() => this.anim?.animate('rightHand', { rotation: 0 }, { duration: 250, easing: 'easeInOut' }));
            });

            panel.querySelector('#btn-pt-toggle-skeleton')?.addEventListener('click', () => {
                toggleSkeletonOverlay();
            });

            // Ensure test target is ready on page
            if (typeof document !== 'undefined') {
                ensureTestTargetElement();
            }

            // =========================================================================
            // Step 4 Look / Gaze Controller Debug Bindings (Requirement 11, 12 & 13)
            // =========================================================================
            const ensureGazeTestTargetElement = () => {
                let el = document.getElementById('gaze-test-target');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'gaze-test-target';
                    el.className = 'buddy-gaze-test-target';
                    el.style.position = 'fixed';
                    el.style.top = '22%';
                    el.style.left = '28%';
                    el.style.padding = '8px 16px';
                    el.style.borderRadius = '10px';
                    el.style.background = 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)';
                    el.style.color = '#FFFFFF';
                    el.style.fontWeight = 'bold';
                    el.style.fontSize = '12px';
                    el.style.boxShadow = '0 6px 18px rgba(147, 51, 234, 0.4)';
                    el.style.border = '2px solid #C084FC';
                    el.style.zIndex = '99999';
                    el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    el.style.cursor = 'move';
                    el.innerHTML = '👀 <span>GAZE TEST</span>';
                    document.body.appendChild(el);
                }
                return el;
            };

            if (typeof document !== 'undefined') {
                ensureGazeTestTargetElement();
            }

            if (this.gazeController) {
                this.gazeController.onStateChange((st) => {
                    const elAction = panel.querySelector('#db-gaze-action');
                    const elTarget = panel.querySelector('#db-gaze-target');
                    const elTx = panel.querySelector('#db-gaze-tx');
                    const elTy = panel.querySelector('#db-gaze-ty');
                    const elEyeX = panel.querySelector('#db-gaze-eyex');
                    const elEyeY = panel.querySelector('#db-gaze-eyey');
                    const elHeadRot = panel.querySelector('#db-gaze-headrot');

                    if (elAction) elAction.textContent = st.currentGaze || 'NONE';
                    if (elTarget) elTarget.textContent = st.targetName || 'NONE';
                    if (elTx) elTx.textContent = `${Math.round(st.targetX || 0)}px`;
                    if (elTy) elTy.textContent = `${Math.round(st.targetY || 0)}px`;
                    if (elEyeX) elEyeX.textContent = `${st.eyeX || 0}px`;
                    if (elEyeY) elEyeY.textContent = `${st.eyeY || 0}px`;
                    if (elHeadRot) elHeadRot.textContent = `${st.headRotation || 0}°`;
                });
            }

            panel.querySelector('#btn-gaze-left')?.addEventListener('click', () => {
                this.lookAt({ type: 'position', x: 120, y: 350 });
            });

            panel.querySelector('#btn-gaze-right')?.addEventListener('click', () => {
                const rX = typeof window !== 'undefined' ? window.innerWidth - 120 : 800;
                this.lookAt({ type: 'position', x: rX, y: 350 });
            });

            panel.querySelector('#btn-gaze-up')?.addEventListener('click', () => {
                const uX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
                this.lookAt({ type: 'position', x: uX, y: 80 });
            });

            panel.querySelector('#btn-gaze-down')?.addEventListener('click', () => {
                const dX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
                const dY = typeof window !== 'undefined' ? window.innerHeight - 80 : 700;
                this.lookAt({ type: 'position', x: dX, y: dY });
            });

            panel.querySelector('#btn-gaze-center')?.addEventListener('click', () => {
                this.clearGaze();
            });

            panel.querySelector('#btn-gaze-test-target')?.addEventListener('click', () => {
                ensureGazeTestTargetElement();
                this.lookAt({ type: 'element', targetId: 'gaze-test-target' });
            });

            panel.querySelector('#btn-gaze-clear')?.addEventListener('click', () => {
                this.clearGaze();
            });

            // =========================================================================
            // Step 5 Facial Reaction & Emotion Controller Debug Bindings
            // =========================================================================
            if (this.face) {
                this.face.onStateChange((st) => {
                    const elEmo = panel.querySelector('#db-face-emotion');
                    const elBlink = panel.querySelector('#db-face-blink');
                    const elEyes = panel.querySelector('#db-face-eyes');
                    const elEyebrows = panel.querySelector('#db-face-eyebrows');
                    const elMouth = panel.querySelector('#db-face-mouth');

                    if (elEmo) elEmo.textContent = st.currentEmotion || 'NEUTRAL';
                    if (elBlink) elBlink.textContent = st.blinkState || 'READY';
                    if (elEyes) elEyes.textContent = st.eyeState || 'OPEN';
                    if (elEyebrows) elEyebrows.textContent = st.eyebrowState || 'UNAVAILABLE';
                    if (elMouth) elMouth.textContent = st.mouthState || 'NEUTRAL';
                });
            }

            panel.querySelector('#btn-face-neutral')?.addEventListener('click', () => {
                this.setEmotion('neutral');
            });
            panel.querySelector('#btn-face-happy')?.addEventListener('click', () => {
                this.setEmotion('happy');
            });
            panel.querySelector('#btn-face-surprised')?.addEventListener('click', () => {
                this.setEmotion('surprised');
            });
            panel.querySelector('#btn-face-thinking')?.addEventListener('click', () => {
                this.setEmotion('thinking');
            });
            panel.querySelector('#btn-face-confused')?.addEventListener('click', () => {
                this.setEmotion('confused');
            });
            panel.querySelector('#btn-face-sad')?.addEventListener('click', () => {
                this.setEmotion('sad');
            });
            panel.querySelector('#btn-face-blink')?.addEventListener('click', () => {
                this.blink();
            });
            panel.querySelector('#btn-face-reset')?.addEventListener('click', () => {
                this.resetFace();
            });

            // =========================================================================
            // Step 6 Browser Event Reaction Controller Debug Bindings
            // =========================================================================
            if (this.reactionManager) {
                this.reactionManager.onStateChange((st) => {
                    const elEv = panel.querySelector('#db-rx-event');
                    const elRx = panel.querySelector('#db-rx-reaction');
                    const elTg = panel.querySelector('#db-rx-target');
                    const elPr = panel.querySelector('#db-rx-priority');
                    const elCd = panel.querySelector('#db-rx-cooldown');
                    const elQ = panel.querySelector('#db-rx-queue');
                    const elLast = panel.querySelector('#db-rx-last-log');

                    if (elEv) elEv.textContent = st.currentEvent || 'NONE';
                    if (elRx) elRx.textContent = st.currentReaction || 'NONE';
                    if (elTg) elTg.textContent = st.target || 'NONE';
                    if (elPr) elPr.textContent = st.priority || 'NONE';
                    if (elCd) elCd.textContent = st.cooldown || 'READY';
                    if (elQ) elQ.textContent = st.queueSize > 0 ? `${st.queueSize} queued` : 'EMPTY';
                    if (elLast) elLast.textContent = st.lastEvent || 'NONE';
                });
            }

            panel.querySelector('#btn-rx-hover')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'hover', target: 'test-hotel-card', targetId: 'hotel-card', reaction: 'look' });
            });
            panel.querySelector('#btn-rx-click')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'click', target: 'test-point-btn', targetId: 'start-button', reaction: 'attention' });
            });
            panel.querySelector('#btn-rx-success')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'success', target: 'USER', targetId: 'lesson', reaction: 'positive' });
            });
            panel.querySelector('#btn-rx-error')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'error', target: 'USER', targetId: 'login', reaction: 'negative' });
            });
            panel.querySelector('#btn-rx-visible')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'target-visible', target: 'test-hotel-card', targetId: 'hotel-card', reaction: 'look' });
            });
            panel.querySelector('#btn-rx-hidden')?.addEventListener('click', () => {
                this.reactionManager?.handle({ type: 'target-hidden', target: 'test-hotel-card', targetId: 'hotel-card', reaction: 'release' });
            });
            panel.querySelector('#btn-rx-reset')?.addEventListener('click', () => {
                this.reactionManager?.reset();
            });

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

            // =========================================================================
            // Step 5 Character Behavior Buttons Binding
            // =========================================================================
            panel.querySelector('#btn-bh-happy')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "I love exploring new places with you! 😊",
                    emotion: "happy",
                    intensity: 0.75,
                    intent: "greeting"
                });
            });

            panel.querySelector('#btn-bh-surprise')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "Whoa, look at that sudden route change! 😲",
                    emotion: "surprised",
                    intensity: 0.85,
                    intent: "discovery"
                });
            });

            panel.querySelector('#btn-bh-look-user')?.addEventListener('click', () => {
                this.behavior?.lookAt('USER', 2, 3000);
            });

            panel.querySelector('#btn-bh-point')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "I recommend checking out this world region next!",
                    emotion: "happy",
                    intensity: 0.7,
                    intent: "recommendation"
                });
            });

            panel.querySelector('#btn-bh-warning')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "Heads up! We might be exceeding our budget here.",
                    emotion: "worried",
                    intensity: 0.9,
                    intent: "warning"
                });
            });

            panel.querySelector('#btn-bh-celebrate')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "Trip completed! Amazing work reaching all destinations! 🎉",
                    emotion: "excited",
                    intensity: 1.0,
                    intent: "celebration"
                });
            });

            panel.querySelector('#btn-bh-idle')?.addEventListener('click', () => {
                this.behavior?.idle?.performRandomIdleAction();
            });

            panel.querySelector('#btn-bh-silence')?.addEventListener('click', () => {
                this.behavior?.handleAIDecision({
                    message: "",
                    emotion: "neutral",
                    intensity: 0.4,
                    intent: "silence"
                });
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
                    const stEl = panel.querySelector('#db-b-state');
                    const emoEl = panel.querySelector('#db-b-emotion');
                    const attEl = panel.querySelector('#db-b-attention');
                    const gesEl = panel.querySelector('#db-b-gesture');
                    const seqEl = panel.querySelector('#db-b-sequence');
                    const intEl = panel.querySelector('#db-b-intent');

                    if (stEl) {
                        const isSeq = state.sequencer && state.sequencer.isRunning;
                        stEl.textContent = isSeq ? 'SEQUENCE RUNNING' : (state.idleRunning ? 'IDLE' : 'STANDBY');
                        stEl.style.color = isSeq ? '#F59E0B' : '#4ADE80';
                    }
                    if (emoEl) emoEl.textContent = `${state.emotion.emotion.toUpperCase()} (${state.emotion.intensity.toFixed(2)})`;
                    if (attEl) attEl.textContent = state.attention;
                    if (gesEl) gesEl.textContent = (state.gesture || 'NONE').toUpperCase();
                    if (seqEl && state.sequencer) {
                        seqEl.textContent = `${state.sequencer.currentSequence} (${state.sequencer.queueLength} queued)`;
                    }
                    if (intEl) intEl.textContent = (state.lastIntent || 'NONE').toUpperCase();
                });
            }

            if (this.rig) {
                this.rig.onChange((states) => {
                    const headEl = panel.querySelector('#db-rig-head');
                    const lArmEl = panel.querySelector('#db-rig-larm');
                    const rArmEl = panel.querySelector('#db-rig-rarm');
                    const eyesEl = panel.querySelector('#db-rig-eyes');

                    if (headEl && states.head) {
                        headEl.textContent = `${states.head.rotation.toFixed(0)}°`;
                    }
                    if (lArmEl && states.leftUpperArm && states.leftForearm && states.leftHand) {
                        lArmEl.textContent = `${states.leftUpperArm.rotation.toFixed(0)}° / ${states.leftForearm.rotation.toFixed(0)}° / ${states.leftHand.rotation.toFixed(0)}°`;
                    }
                    if (rArmEl && states.rightUpperArm && states.rightForearm && states.rightHand) {
                        rArmEl.textContent = `${states.rightUpperArm.rotation.toFixed(0)}° / ${states.rightForearm.rotation.toFixed(0)}° / ${states.rightHand.rotation.toFixed(0)}°`;
                    }
                    if (eyesEl && states.leftEye) {
                        eyesEl.textContent = `${states.leftEye.x.toFixed(0)}px, ${states.leftEye.y.toFixed(0)}px`;
                    }
                });
            }

            if (this.anim) {
                this.anim.onChange((engine) => {
                    const animNameEl = panel.querySelector('#db-anim-name');
                    const prioEl = panel.querySelector('#db-anim-priority');
                    const lockedEl = panel.querySelector('#db-anim-locked');
                    const activeEl = panel.querySelector('#db-anim-active');
                    const headRotEl = panel.querySelector('#db-anim-head-rot');
                    const rArmRotEl = panel.querySelector('#db-anim-rarm-rot');
                    const lArmRotEl = panel.querySelector('#db-anim-larm-rot');
                    const queueEl = panel.querySelector('#db-anim-queue');

                    if (animNameEl) animNameEl.textContent = engine.currentActionName;
                    if (prioEl) prioEl.textContent = `LEVEL ${engine.currentPriority}`;

                    const locked = engine.getLockedParts();
                    if (lockedEl) lockedEl.textContent = locked.length > 0 ? locked.join(', ') : 'NONE';

                    const active = engine.getActiveParts();
                    if (activeEl) activeEl.textContent = active.length > 0 ? active.join(', ') : 'NONE';

                    if (this.rig) {
                        const hState = this.rig.getPartState('head');
                        const rState = this.rig.getPartState('rightUpperArm');
                        const lState = this.rig.getPartState('leftUpperArm');
                        if (headRotEl && hState) headRotEl.textContent = `${hState.rotation.toFixed(0)}°`;
                        if (rArmRotEl && rState) rArmRotEl.textContent = `${rState.rotation.toFixed(0)}°`;
                        if (lArmRotEl && lState) lArmRotEl.textContent = `${lState.rotation.toFixed(0)}°`;
                    }

                    if (queueEl) queueEl.textContent = engine.getQueueLength().toString();
                });
            }

            if (this.pointAction) {
                this.pointAction.onProgress((info) => {
                    const actEl = panel.querySelector('#db-pt-action');
                    const tgtEl = panel.querySelector('#db-pt-target');
                    const crdEl = panel.querySelector('#db-pt-coords');
                    const angEl = panel.querySelector('#db-pt-angle');
                    const hdEl = panel.querySelector('#db-pt-head');
                    const armEl = panel.querySelector('#db-pt-arm');
                    const elbEl = panel.querySelector('#db-pt-elbow');
                    const wstEl = panel.querySelector('#db-pt-wrist');
                    const lckEl = panel.querySelector('#db-pt-locked');
                    const prgEl = panel.querySelector('#db-pt-progress');

                    if (actEl) actEl.textContent = info.isActive ? 'POINT' : 'IDLE';
                    if (prgEl) prgEl.textContent = info.phase || (info.isActive ? 'RUNNING' : 'IDLE');

                    if (info.targetData) {
                        if (tgtEl) tgtEl.textContent = info.targetData.targetId || 'POSITION';
                        if (crdEl) crdEl.textContent = `${Math.round(info.targetData.targetX)}px, ${Math.round(info.targetData.targetY)}px`;
                        if (angEl) angEl.textContent = `${Math.round(info.targetData.angleDeg)}°`;
                        if (armEl) armEl.textContent = info.targetData.pointingArm ? info.targetData.pointingArm.toUpperCase() : 'RIGHT';
                    }
                    if (info.poseData && info.poseData.metrics) {
                        if (hdEl) hdEl.textContent = `${info.poseData.metrics.headAngleDeg}°`;
                        if (elbEl) elbEl.textContent = `${info.poseData.metrics.forearmAngleDeg}°`;
                        if (wstEl) wstEl.textContent = `${info.poseData.metrics.handAngleDeg}°`;
                    }
                    if (lckEl) {
                        const lcks = this.pointAction.lockedParts;
                        lckEl.textContent = lcks.length > 0 ? lcks.join(', ') : 'NONE';
                    }
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

        // --- Step 3 Point Action Control ---
        pointAt(target, options = {}) {
            return this.pointAction?.execute({ target, ...options });
        }

        cancelPoint() {
            this.pointAction?.cancel();
        }

        // --- Step 2 Animation Engine Core Controls ---
        animate(partKey, targetProperties, options) {
            return this.anim?.animate(partKey, targetProperties, options);
        }

        parallel(partAnimations, options) {
            return this.anim?.parallel(partAnimations, options);
        }

        sequence(steps, options) {
            return this.anim?.sequence(steps, options);
        }

        createTimeline(options) {
            return this.anim?.createTimeline(options);
        }

        resetAll(options) {
            return this.anim?.resetAll(options);
        }

        cancelAnimation(partKey) {
            if (partKey) {
                this.anim?.cancelPart(partKey);
            } else {
                this.anim?.cancelCurrent();
            }
        }

        lockParts(parts, ownerId, priority) {
            return this.anim?.lockParts(parts, ownerId, priority);
        }

        unlockParts(parts, ownerId) {
            return this.anim?.unlockParts(parts, ownerId);
        }

        // --- Step 1 Rig Controls ---
        setPartRotation(partKey, degrees) {
            return this.rig?.setRotation(partKey, degrees);
        }

        setPartPosition(partKey, x, y) {
            return this.rig?.setPosition(partKey, x, y);
        }

        setPartScale(partKey, scaleX, scaleY) {
            return this.rig?.setScale(partKey, scaleX, scaleY);
        }

        setPartOpacity(partKey, opacity) {
            return this.rig?.setOpacity(partKey, opacity);
        }

        setPartTransform(partKey, transformObj) {
            return this.rig?.setTransform(partKey, transformObj);
        }

        resetPart(partKey) {
            return this.rig?.resetPart(partKey);
        }

        resetRig() {
            return this.rig?.resetAll();
        }

        getRigPartState(partKey) {
            return this.rig?.getPartState(partKey);
        }

        getAllRigStates() {
            return this.rig?.getAllPartStates();
        }

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

        lookAt(target = 'USER', options = {}) {
            if (this.gazeController) {
                const opt = (typeof options === 'object' && options !== null) ? options : { priority: options };
                return this.gazeController.lookAt(target, opt);
            }
            const priority = (typeof options === 'object' && options?.priority) ? options.priority : 1;
            const duration = (typeof options === 'object' && options?.duration) ? options.duration : 0;
            return this.behavior?.lookAt(target, priority, duration);
        }

        clearGaze(options = {}) {
            if (this.gazeController) {
                return this.gazeController.clearGaze(options);
            }
            return Promise.resolve();
        }

        pointAt(target, options = {}) {
            if (this.pointAction) {
                return this.pointAction.execute({ target, ...options });
            }
            return Promise.resolve({ success: false });
        }

        setEmotion(emotion = 'neutral', options = {}) {
            const intensity = (typeof options === 'object' && options?.intensity !== undefined)
                ? options.intensity
                : (typeof options === 'number' ? options : 1.0);

            this.behavior?.setEmotion(emotion, intensity);
            this.controller?.setEmotion(emotion);

            if (this.face) {
                const opt = (typeof options === 'object' && options !== null) ? options : { intensity };
                return this.face.setEmotion(emotion, opt);
            }
            return Promise.resolve({ success: true, emotion });
        }

        blink(options = {}) {
            if (this.face) {
                return this.face.blink(options);
            }
            return Promise.resolve({ success: false });
        }

        resetFace(options = {}) {
            if (this.face) {
                return this.face.resetFace(options);
            }
            return Promise.resolve({ success: false });
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

        say(text, duration = 3200) {
            if (global.momoSpeech && typeof global.momoSpeech.say === 'function') {
                global.momoSpeech.say(text, { duration });
            } else {
                this.controller?.say(text, duration);
            }
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

        reactTo(eventDescriptor = {}) {
            if (this.reactionManager) {
                return this.reactionManager.handle(eventDescriptor);
            }
            return Promise.resolve({ success: false });
        }

        destroy() {
            for (const unsub of this.unsubscribeEvents) {
                unsub();
            }
            this.unsubscribeEvents = [];
            if (this.eventDetector) {
                this.eventDetector.detach();
            }
            if (this.reactionManager) {
                this.reactionManager.reset();
            }
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
