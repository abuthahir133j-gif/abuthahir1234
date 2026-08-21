/**
 * Momo AI Buddy — Primary Character & Animation Controller
 * 
 * Manages character lifecycle, greeting state machine (IDLE, GREETING, COMPLETED),
 * duplicate event deduplication, and coordinates semantic actions (GreetingAction, MomoSpeech).
 */
(function (global) {
    const _GreetingAction = (typeof global.GreetingAction !== 'undefined')
        ? global.GreetingAction
        : (typeof require !== 'undefined' ? require('./actions/GreetingAction') : null);

    const _MomoSpeech = (typeof global.MomoSpeech !== 'undefined')
        ? global.MomoSpeech
        : (typeof require !== 'undefined' ? require('../../voice/buddy/MomoSpeech').MomoSpeech : null);

    const _buddyEvents = (typeof global.buddyEvents !== 'undefined')
        ? global.buddyEvents
        : (typeof require !== 'undefined' ? require('../../events/buddyEvents').buddyEvents : null);

    const MOMO_STATES = {
        IDLE: 'IDLE',
        GREETING: 'GREETING',
        COMPLETED: 'COMPLETED'
    };

    class MomoController {
        constructor(options = {}) {
            this.name = 'Momo';
            this.state = MOMO_STATES.IDLE;
            this.events = options.events || _buddyEvents;
            this.animEngine = options.animationEngine || null;
            this.rig = options.rig || null;
            this.scene = options.scene || null;

            this.speech = options.speech || (_MomoSpeech ? new _MomoSpeech({ scene: this.scene }) : null);
            this.greetingAction = new _GreetingAction(this.animEngine, {
                rig: this.rig,
                speech: this.speech,
                gazeController: options.gazeController || null,
                faceController: options.faceController || null
            });

            this.listeners = new Set();
            this.unsubscribeEventBus = null;

            this.initEventSubscriptions();
        }

        attachComponents({ animationEngine, rig, scene, gazeController, faceController, speech }) {
            if (animationEngine) {
                this.animEngine = animationEngine;
                this.greetingAction.setAnimationEngine(animationEngine);
            }
            if (rig) {
                this.rig = rig;
            }
            if (scene) {
                this.scene = scene;
                if (this.speech && typeof this.speech.setScene === 'function') {
                    this.speech.setScene(scene);
                }
            }
            this.greetingAction.setDependencies({
                gazeController,
                faceController,
                speech: speech || this.speech,
                rig: this.rig || (animationEngine ? animationEngine.rig : null)
            });
        }

        initEventSubscriptions() {
            if (this.events && typeof this.events.on === 'function') {
                this.unsubscribeEventBus = this.events.on('LOGIN_SUCCESS', (data) => {
                    this.handleLoginSuccess(data);
                });
            }
        }

        getState() {
            return this.state;
        }

        setState(newState) {
            this.state = newState;
            for (const cb of this.listeners) {
                try { cb(this.state); } catch (e) {}
            }
        }

        onStateChange(callback) {
            this.listeners.add(callback);
            callback(this.state);
            return () => this.listeners.delete(callback);
        }

        /**
         * Core Login Success Handler
         * Receives { type: 'LOGIN_SUCCESS', studentId: '...' }
         * Only non-sensitive student metadata is processed.
         */
        async handleLoginSuccess(eventData = {}) {
            console.log('LOGIN_SUCCESS');

            // 1. Duplicate Event Protection
            if (this.state === MOMO_STATES.GREETING) {
                console.warn('[MomoController] Greeting currently in progress. Ignoring duplicate LOGIN_SUCCESS event.');
                return { success: false, reason: 'DUPLICATE_IGNORED' };
            }

            this.setState(MOMO_STATES.GREETING);

            this.currentGreetingPromise = (async () => {
                try {
                    // Execute the semantic Greeting Action
                    const result = await this.greetingAction.execute({
                        studentId: eventData.studentId || null
                    });

                    this.setState(MOMO_STATES.COMPLETED);

                    // Transition back to IDLE baseline
                    this.setState(MOMO_STATES.IDLE);
                    return result;
                } catch (err) {
                    console.error('[MomoController] Error during login greeting execution:', err);
                    this.setState(MOMO_STATES.IDLE);
                    return { success: false, error: err?.message };
                }
            })();

            return this.currentGreetingPromise;
        }

        /**
         * Development / Testing trigger for [ TEST MOMO GREETING ] button
         */
        async triggerTestGreeting(testStudentId = 'TEST_STUDENT_01') {
            console.log('[MomoController] [TEST MOMO GREETING] Triggered.');
            if (this.events && typeof this.events.emit === 'function') {
                this.events.emit('LOGIN_SUCCESS', {
                    type: 'LOGIN_SUCCESS',
                    studentId: testStudentId
                });
                if (this.currentGreetingPromise) {
                    return this.currentGreetingPromise;
                }
            } else {
                return this.handleLoginSuccess({
                    type: 'LOGIN_SUCCESS',
                    studentId: testStudentId
                });
            }
        }

        destroy() {
            if (this.unsubscribeEventBus) {
                this.unsubscribeEventBus();
                this.unsubscribeEventBus = null;
            }
            if (this.greetingAction) {
                this.greetingAction.stop();
            }
            this.listeners.clear();
            this.setState(MOMO_STATES.IDLE);
        }
    }

    const momoController = new MomoController();

    global.MOMO_STATES = MOMO_STATES;
    global.MomoController = MomoController;
    global.momoController = momoController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            MOMO_STATES,
            MomoController,
            momoController
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
