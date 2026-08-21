/**
 * Momo AI Buddy — Step 1 Login Greeting Action (Semantic Action: GREETING)
 * 
 * Coordinates the 7-phase greeting sequence:
 * PHASE 1: Momo becomes active (MOMO_GREETING_STARTED)
 * PHASE 2: Momo looks toward student / UI
 * PHASE 3: Momo raises one hand naturally through anatomical chain (HAND_RAISE)
 *          (Shoulder / Upper Arm -> Elbow / Forearm -> Wrist / Hand)
 * PHASE 4: Momo holds hand-up pose briefly
 * PHASE 5: Momo speaks: "Hi, I am Momo, let's see today's adventure!" (TTS_STARTED -> TTS_COMPLETED)
 * PHASE 6: Momo lowers hand naturally (HAND_LOWER)
 * PHASE 7: Momo returns to IDLE (MOMO_IDLE)
 */
(function (global) {
    const _StateModule = (typeof global.BuddyAnimationState !== 'undefined')
        ? global.BuddyAnimationState
        : (typeof require !== 'undefined' ? require('../../../components/TravelBuddy/BuddyAnimationState') : {});

    const _MomoSpeech = (typeof global.momoSpeech !== 'undefined')
        ? global.momoSpeech
        : (typeof require !== 'undefined' ? require('../../../voice/buddy/MomoSpeech').momoSpeech : null);

    const AnimationPriority = _StateModule.AnimationPriority || { IDLE: 1, NORMAL: 2, IMPORTANT: 3, CRITICAL: 4 };

    class GreetingAction {
        constructor(animationEngine = null, options = {}) {
            this.anim = animationEngine;
            this.rig = options.rig || (animationEngine ? animationEngine.rig : null);
            this.gazeController = options.gazeController || null;
            this.faceController = options.faceController || null;
            this.speech = options.speech || _MomoSpeech;
            this.activeArm = options.activeArm || 'right'; // 'right' or 'left'
            this.isRunning = false;
        }

        setAnimationEngine(anim) {
            this.anim = anim;
            if (anim && anim.rig) {
                this.rig = anim.rig;
            }
        }

        setDependencies({ gazeController, faceController, speech, rig }) {
            if (gazeController) this.gazeController = gazeController;
            if (faceController) this.faceController = faceController;
            if (speech) this.speech = speech;
            if (rig) this.rig = rig;
        }

        /**
         * Execute the full 7-phase Greeting Action
         * @param {object} [params]
         * @returns {Promise<{ success: boolean, error?: string }>}
         */
        async execute(params = {}) {
            if (this.isRunning) {
                console.warn('[GreetingAction] Greeting is already actively running. Ignoring call.');
                return { success: false, reason: 'ALREADY_RUNNING' };
            }

            this.isRunning = true;

            try {
                // ==========================================
                // PHASE 1: Momo becomes active
                // ==========================================
                console.log('MOMO_GREETING_STARTED');

                const upperArmKey = this.activeArm === 'right' ? 'rightUpperArm' : 'leftUpperArm';
                const forearmKey = this.activeArm === 'right' ? 'rightForearm' : 'leftForearm';
                const handKey = this.activeArm === 'right' ? 'rightHand' : 'leftHand';

                // Set facial expression to friendly / happy
                if (this.faceController && typeof this.faceController.setEmotion === 'function') {
                    this.faceController.setEmotion('happy', { duration: 300 });
                }

                // ==========================================
                // PHASE 2: Momo looks toward student / UI
                // ==========================================
                if (this.gazeController && typeof this.gazeController.lookAtCenter === 'function') {
                    this.gazeController.lookAtCenter({ priority: AnimationPriority.IMPORTANT, duration: 400 });
                } else if (this.anim) {
                    await this.anim.parallel([
                        { part: 'head', properties: { rotation: 0, y: -2 }, duration: 250, easing: 'easeOutQuad' },
                        { part: 'leftEye', properties: { x: 0, y: 0 }, duration: 250 },
                        { part: 'rightEye', properties: { x: 0, y: 0 }, duration: 250 }
                    ], { priority: AnimationPriority.IMPORTANT, owner: 'greeting' });
                }

                // ==========================================
                // PHASE 3: Momo raises one hand naturally
                // Shoulder -> Upper Arm -> Elbow -> Forearm -> Wrist -> Hand
                // ==========================================
                console.log('HAND_RAISE');

                const isRight = this.activeArm === 'right';
                // Right arm raises upward: negative angle; Left arm: positive angle
                const upperArmTarget = isRight ? -62 : 62;
                const forearmTarget = isRight ? -32 : 32;
                const handTarget = isRight ? -22 : 22;

                if (this.anim) {
                    // Kinematic cascade: Upper arm leads, forearm follows slightly delayed, wrist settles
                    await Promise.all([
                        this.anim.animate(upperArmKey, { rotation: upperArmTarget }, {
                            duration: 400,
                            easing: 'easeOutCubic',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        }),
                        this.anim.animate(forearmKey, { rotation: forearmTarget }, {
                            duration: 440,
                            delay: 60,
                            easing: 'easeOutCubic',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        }),
                        this.anim.animate(handKey, { rotation: handTarget }, {
                            duration: 480,
                            delay: 120,
                            easing: 'easeOutBack',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        })
                    ]);
                } else if (this.rig) {
                    this.rig.setRotation(upperArmKey, upperArmTarget);
                    this.rig.setRotation(forearmKey, forearmTarget);
                    this.rig.setRotation(handKey, handTarget);
                }

                // ==========================================
                // PHASE 4: Momo holds hand-up pose briefly
                // ==========================================
                await new Promise(r => setTimeout(r, 250));

                // ==========================================
                // PHASE 5: Momo speaks: "Hi, I am Momo, let's see today's adventure!"
                // ==========================================
                const exactGreetingText = "Hi, I am Momo, let's see today's adventure!";

                if (this.speech && typeof this.speech.say === 'function') {
                    try {
                        await this.speech.say(exactGreetingText, {
                            emotion: 'happy',
                            duration: 3200
                        });
                    } catch (ttsErr) {
                        console.warn('TTS ERROR:', ttsErr?.message || ttsErr);
                    }
                } else {
                    // Fallback log if speech module not configured
                    console.log('TTS_STARTED');
                    await new Promise(r => setTimeout(r, 2000));
                    console.log('TTS_COMPLETED');
                }

                // Brief pause after speech before lowering hand
                await new Promise(r => setTimeout(r, 200));

                // ==========================================
                // PHASE 6: Momo lowers the hand naturally
                // ==========================================
                console.log('HAND_LOWER');

                if (this.anim) {
                    await Promise.all([
                        this.anim.animate(handKey, { rotation: 0 }, {
                            duration: 350,
                            easing: 'easeInOutQuad',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        }),
                        this.anim.animate(forearmKey, { rotation: 0 }, {
                            duration: 380,
                            delay: 40,
                            easing: 'easeInOutQuad',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        }),
                        this.anim.animate(upperArmKey, { rotation: 0 }, {
                            duration: 420,
                            delay: 80,
                            easing: 'easeInOutQuad',
                            priority: AnimationPriority.IMPORTANT,
                            owner: 'greeting'
                        })
                    ]);
                } else if (this.rig) {
                    this.rig.setRotation(handKey, 0);
                    this.rig.setRotation(forearmKey, 0);
                    this.rig.setRotation(upperArmKey, 0);
                }

                // ==========================================
                // PHASE 7: Momo returns to IDLE
                // ==========================================
                if (this.anim) {
                    await this.anim.resetAll({ animated: false });
                } else if (this.rig) {
                    this.rig.resetAll();
                }

                if (this.faceController && typeof this.faceController.reset === 'function') {
                    this.faceController.reset();
                }

                console.log('MOMO_IDLE');
                this.isRunning = false;
                return { success: true };

            } catch (err) {
                console.error('[GreetingAction] Error during greeting sequence:', err);
                // Safe recovery to neutral pose
                try {
                    if (this.anim) this.anim.resetAll({ animated: false });
                    else if (this.rig) this.rig.resetAll();
                } catch (e) {}

                console.log('MOMO_IDLE');
                this.isRunning = false;
                return { success: false, error: err?.message };
            }
        }

        stop() {
            this.isRunning = false;
            if (this.speech && typeof this.speech.stop === 'function') {
                this.speech.stop();
            }
            if (this.anim) {
                this.anim.cancelCurrent();
            }
        }
    }

    global.GreetingAction = GreetingAction;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GreetingAction;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
