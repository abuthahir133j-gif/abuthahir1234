/**
 * Travel AI Buddy — Step 5: Master Facial & Emotion Controller
 * 
 * Orchestrates natural facial expressions, emotions, blinks, and composed gaze states.
 * 
 * Rules:
 * - Strictly operates within AI/png.svg rig.
 * - Only uses available parts (leftEye, rightEye, mouth, head, face).
 * - Eyebrows gracefully reported as unavailable without crashing.
 * - Composes smoothly with Step 4 Gaze System and Step 3 Point Action.
 */
(function (global) {
    const _FacePoseCalculator = (typeof global.FacePoseCalculator !== 'undefined')
        ? global.FacePoseCalculator
        : (typeof require !== 'undefined' ? require('./FacePoseCalculator').FacePoseCalculator : null);

    const _EMOTIONS = (typeof global.EMOTIONS !== 'undefined')
        ? global.EMOTIONS
        : (typeof require !== 'undefined' ? require('./FacePoseCalculator').EMOTIONS : {
            NEUTRAL: 'neutral',
            HAPPY: 'happy',
            SURPRISED: 'surprised',
            THINKING: 'thinking',
            CONFUSED: 'confused',
            SAD: 'sad'
        });

    const _AnimationPriority = (typeof global.AnimationPriority !== 'undefined')
        ? global.AnimationPriority
        : (typeof require !== 'undefined' ? require('../../../components/TravelBuddy/BuddyAnimationState').AnimationPriority : {
            BACKGROUND: 0,
            LOW: 1,
            NORMAL: 2,
            HIGH: 3,
            CRITICAL: 4
        });

    class BuddyFaceController {
        /**
         * @param {BuddyAnimationEngine} engine
         * @param {BuddyRigController} [rig]
         */
        constructor(engine = null, rig = null) {
            this.engine = engine;
            this.rig = rig || (engine ? engine.rig : null);

            this.currentEmotion = _EMOTIONS.NEUTRAL;
            this.currentIntensity = 1.0;
            this.currentEmotionData = null;

            this.isBlinking = false;
            this.blinkTimer = null;
            this.currentActionId = null;

            this.state = {
                currentEmotion: _EMOTIONS.NEUTRAL,
                blinkState: 'READY',
                eyeState: 'OPEN',
                eyebrowState: 'UNAVAILABLE (N/A in AI/png.svg)',
                mouthState: 'NEUTRAL',
                intensity: 1.0
            };

            this.listeners = new Set();
        }

        attachEngine(engine) {
            this.engine = engine;
            this.rig = engine?.rig || this.rig;
        }

        /**
         * Transition face smoothly to a specific emotion
         * @param {string} emotion 'neutral' | 'happy' | 'surprised' | 'thinking' | 'confused' | 'sad'
         * @param {object} [options] { intensity, duration, speed, priority, easing }
         * @returns {Promise<object>} Status result
         */
        async setEmotion(emotion = _EMOTIONS.NEUTRAL, options = {}) {
            if (!this.engine) {
                console.warn('[BuddyFaceController] No animation engine attached.');
                return { success: false, reason: 'NO_ENGINE' };
            }

            const rawEmotion = (typeof emotion === 'string') ? emotion.toLowerCase().trim() : _EMOTIONS.NEUTRAL;
            const intensity = options.intensity !== undefined ? Number(options.intensity) : 1.0;
            const priority = options.priority || _AnimationPriority.NORMAL;
            const speed = Math.max(0.1, Number(options.speed) || 1);

            const emotionData = _FacePoseCalculator
                ? _FacePoseCalculator.calculateEmotionPose(rawEmotion, intensity)
                : { emotion: rawEmotion, intensity, pose: {} };

            this.currentEmotion = rawEmotion;
            this.currentIntensity = intensity;
            this.currentEmotionData = emotionData;

            const actionId = `face_emotion_${Date.now()}`;
            this.currentActionId = actionId;

            // Lock face parts
            const faceParts = ['leftEye', 'rightEye', 'mouth', 'head'];
            this.engine.lockParts(faceParts, actionId, priority);

            const duration = Math.round((options.duration || emotionData.timing?.duration || 320) / speed);
            const easing = options.easing || emotionData.timing?.easing || 'easeInOut';

            // Update telemetry
            this.state = {
                ...this.state,
                currentEmotion: rawEmotion.toUpperCase(),
                mouthState: rawEmotion === 'neutral' ? 'NEUTRAL' : rawEmotion.toUpperCase(),
                eyeState: this.isBlinking ? 'CLOSED' : (rawEmotion === 'neutral' ? 'OPEN' : `${rawEmotion.toUpperCase()} (OPEN)`),
                intensity
            };
            this._notifyState();

            try {
                const p = emotionData.pose;
                const anims = [];

                if (p.leftEye) {
                    anims.push(this.engine.animate('leftEye', p.leftEye, { duration, easing, priority, owner: actionId }));
                }
                if (p.rightEye) {
                    anims.push(this.engine.animate('rightEye', p.rightEye, { duration, easing, priority, owner: actionId }));
                }
                if (p.mouth) {
                    anims.push(this.engine.animate('mouth', p.mouth, { duration, easing, priority, owner: actionId }));
                }
                if (p.head) {
                    anims.push(this.engine.animate('head', p.head, { duration, easing, priority, owner: actionId }));
                }

                await Promise.all(anims);

                return {
                    success: true,
                    emotion: rawEmotion,
                    intensity,
                    pose: p
                };
            } catch (err) {
                console.error('[BuddyFaceController] Error during emotion transition:', err);
                return { success: false, error: err.message };
            }
        }

        /**
         * Perform a natural single blink on the eye parts
         * Sequence: Eye ScaleY -> 0.05 (fast close ~60ms) -> Eye ScaleY -> restored (open ~90ms)
         * @param {object} [options] { speed, priority }
         * @returns {Promise<object>}
         */
        async blink(options = {}) {
            if (!this.engine) {
                return { success: false, reason: 'NO_ENGINE' };
            }

            if (this.isBlinking) {
                return { success: false, reason: 'ALREADY_BLINKING' };
            }

            this.isBlinking = true;
            this.state.blinkState = 'BLINKING';
            this.state.eyeState = 'CLOSING';
            this._notifyState();

            const speed = Math.max(0.1, Number(options.speed) || 1);
            const closeDuration = Math.round(65 / speed);
            const openDuration = Math.round(95 / speed);
            const priority = options.priority || _AnimationPriority.HIGH;
            const blinkOwner = `blink_${Date.now()}`;

            // Read currently active base emotion for restoration
            const activePose = this.currentEmotionData?.pose || {
                leftEye: { scaleX: 1, scaleY: 1, x: 0, y: 0 },
                rightEye: { scaleX: 1, scaleY: 1, x: 0, y: 0 }
            };

            const leftEyeTarget = activePose.leftEye || { scaleX: 1, scaleY: 1, x: 0, y: 0 };
            const rightEyeTarget = activePose.rightEye || { scaleX: 1, scaleY: 1, x: 0, y: 0 };

            try {
                // 1. Close Eyes (ScaleY -> 0.05)
                this.state.eyeState = 'CLOSED';
                this._notifyState();

                await Promise.all([
                    this.engine.animate('leftEye', { scaleY: 0.05 }, { duration: closeDuration, easing: 'easeIn', priority, owner: blinkOwner }),
                    this.engine.animate('rightEye', { scaleY: 0.05 }, { duration: closeDuration, easing: 'easeIn', priority, owner: blinkOwner })
                ]);

                // 2. Open Eyes back to active emotion pose
                this.state.eyeState = 'OPENING';
                this._notifyState();

                await Promise.all([
                    this.engine.animate('leftEye', { scaleY: leftEyeTarget.scaleY, scaleX: leftEyeTarget.scaleX, y: leftEyeTarget.y, x: leftEyeTarget.x }, { duration: openDuration, easing: 'easeOut', priority, owner: blinkOwner }),
                    this.engine.animate('rightEye', { scaleY: rightEyeTarget.scaleY, scaleX: rightEyeTarget.scaleX, y: rightEyeTarget.y, x: rightEyeTarget.x }, { duration: openDuration, easing: 'easeOut', priority, owner: blinkOwner })
                ]);

                this.isBlinking = false;
                this.state.blinkState = 'READY';
                this.state.eyeState = (this.currentEmotion === 'neutral') ? 'OPEN' : `${this.currentEmotion.toUpperCase()} (OPEN)`;
                this._notifyState();

                return { success: true };
            } catch (err) {
                this.isBlinking = false;
                this.state.blinkState = 'READY';
                this.state.eyeState = 'OPEN';
                this._notifyState();
                return { success: false, error: err.message };
            }
        }

        /**
         * Direct Eye Transformation
         */
        async setEyes(transformObj = {}, options = {}) {
            if (!this.engine) return { success: false };
            const duration = options.duration !== undefined ? options.duration : 250;
            const priority = options.priority || _AnimationPriority.NORMAL;
            const owner = options.owner || `face_eyes_${Date.now()}`;

            await Promise.all([
                this.engine.animate('leftEye', transformObj, { duration, priority, owner, ...options }),
                this.engine.animate('rightEye', transformObj, { duration, priority, owner, ...options })
            ]);

            return { success: true };
        }

        /**
         * Direct Mouth Transformation
         */
        async setMouth(transformObj = {}, options = {}) {
            if (!this.engine) return { success: false };
            const duration = options.duration !== undefined ? options.duration : 250;
            const priority = options.priority || _AnimationPriority.NORMAL;
            const owner = options.owner || `face_mouth_${Date.now()}`;

            await this.engine.animate('mouth', transformObj, { duration, priority, owner, ...options });
            return { success: true };
        }

        /**
         * Direct Eyebrows Transformation — Graceful N/A Handler
         * As per Requirement 23: Eyebrows do not exist as independent SVG elements in AI/png.svg.
         * Gracefully disabled and reported.
         */
        setEyebrows(transformObj = {}, options = {}) {
            const msg = 'Facial part unavailable in current AI/png.svg rig.';
            console.log(`[BuddyFaceController] setEyebrows: ${msg}`);
            return {
                success: false,
                reason: 'PART_NOT_IN_RIG',
                message: msg
            };
        }

        /**
         * Reset face completely to neutral baseline
         * @param {object} [options]
         */
        async resetFace(options = {}) {
            return this.setEmotion(_EMOTIONS.NEUTRAL, {
                duration: options.duration || 300,
                speed: options.speed || 1,
                priority: options.priority || _AnimationPriority.NORMAL
            });
        }

        /**
         * Get current face telemetry state
         */
        getState() {
            return { ...this.state };
        }

        onStateChange(callback) {
            this.listeners.add(callback);
            callback(this.getState());
            return () => this.listeners.delete(callback);
        }

        _notifyState() {
            const st = this.getState();
            for (const cb of this.listeners) {
                try {
                    cb(st);
                } catch (e) {
                    console.error('[BuddyFaceController] Error in listener:', e);
                }
            }
        }
    }

    global.BuddyFaceController = BuddyFaceController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyFaceController
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
