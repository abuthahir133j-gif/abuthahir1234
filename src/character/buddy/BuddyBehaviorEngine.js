/**
 * Travel AI Buddy — Step 5: Character Behavior Master Engine
 * 
 * Bridges AI conversational decisions and intents into physical character behaviors:
 * attention gaze tracking, emotion intensity, facial morphs, gestures, idle scheduler,
 * and cinematic action sequences.
 */
(function (global) {
    const _BuddyAttention = (typeof global.BuddyAttention !== 'undefined')
        ? global.BuddyAttention
        : require('./BuddyAttention').BuddyAttention;

    const _BuddyExpressionController = (typeof global.BuddyExpressionController !== 'undefined')
        ? global.BuddyExpressionController
        : require('./BuddyExpressionController').BuddyExpressionController;

    const _BuddyEmotionEngine = (typeof global.BuddyEmotionEngine !== 'undefined')
        ? global.BuddyEmotionEngine
        : require('./BuddyEmotionEngine').BuddyEmotionEngine;

    const _BuddyGestureController = (typeof global.BuddyGestureController !== 'undefined')
        ? global.BuddyGestureController
        : require('./BuddyGestureController').BuddyGestureController;

    const _BuddyIdleController = (typeof global.BuddyIdleController !== 'undefined')
        ? global.BuddyIdleController
        : require('./BuddyIdleController').BuddyIdleController;

    const _BuddyActionSequencer = (typeof global.BuddyActionSequencer !== 'undefined')
        ? global.BuddyActionSequencer
        : require('./BuddyActionSequencer').BuddyActionSequencer;

    class BuddyBehaviorEngine {
        constructor(controller = null, scene = null, animationManager = null) {
            this.controller = controller;
            this.scene = scene;
            this.animationManager = animationManager;

            this.attention = new _BuddyAttention(scene);
            this.expression = new _BuddyExpressionController(scene, animationManager);
            this.emotion = new _BuddyEmotionEngine(this.expression);
            this.gesture = new _BuddyGestureController(controller);
            this.idle = new _BuddyIdleController(this.attention, this.expression);
            this.sequencer = new _BuddyActionSequencer(this.attention, this.emotion, this.gesture, this.idle);

            this.lastIntent = 'none';
            this.listeners = new Set();
        }

        init(controller, scene, animationManager) {
            this.controller = controller;
            this.scene = scene;
            this.animationManager = animationManager;

            this.attention.setScene(scene);
            this.expression.setScene(scene);
            this.expression.setAnimationManager(animationManager);
            this.gesture.setController(controller);

            // Start natural micro-idle scheduler
            this.idle.start();
        }

        /**
         * Convert an AI decision / intent into a natural physical reaction sequence
         * @param {Object} decision { message, emotion, animation, intent, intensity }
         */
        async handleAIDecision(decision) {
            if (!decision) return;

            const emotion = decision.emotion || 'neutral';
            const intent = decision.intent || this.inferIntentFromDecision(decision);
            const intensity = decision.intensity ?? (emotion === 'excited' ? 0.9 : (emotion === 'neutral' ? 0.4 : 0.7));
            this.lastIntent = intent;
            this.notify();

            // 1. Silence / None Check
            if (intent === 'silence' || intent === 'none') {
                return;
            }

            // 2. Build and Execute Cinematic Action Sequence
            if (intent === 'warning' || emotion === 'worried') {
                await this.sequencer.runSequence({
                    name: 'warningSequence',
                    priority: 2,
                    steps: [
                        { action: 'lookAt', target: 'USER', duration: 400 },
                        { action: 'emotion', value: 'worried', intensity: 0.8, duration: 300 },
                        { action: 'gesture', value: 'warning', duration: 800 }
                    ]
                });
            } else if (intent === 'celebration' || emotion === 'excited') {
                await this.sequencer.runSequence({
                    name: 'celebrationSequence',
                    priority: 2,
                    steps: [
                        { action: 'lookAt', target: 'USER', duration: 300 },
                        { action: 'emotion', value: 'excited', intensity: 1.0, duration: 250 },
                        { action: 'gesture', value: 'celebrate', duration: 1200 }
                    ]
                });
            } else if (intent === 'recommendation' || intent === 'discovery') {
                await this.sequencer.runSequence({
                    name: 'recommendationSequence',
                    priority: 1,
                    steps: [
                        { action: 'lookAt', target: 'MAP', duration: 450 },
                        { action: 'emotion', value: emotion, intensity: intensity, duration: 250 },
                        { action: 'gesture', value: 'point', duration: 900 },
                        { action: 'lookAt', target: 'USER', duration: 400 }
                    ]
                });
            } else if (intent === 'thinking' || emotion === 'thinking') {
                await this.sequencer.runSequence({
                    name: 'thinkingSequence',
                    priority: 1,
                    steps: [
                        { action: 'lookAt', target: 'NOTIFICATION', duration: 300 },
                        { action: 'emotion', value: 'thinking', intensity: intensity, duration: 250 },
                        { action: 'gesture', value: 'thinking', duration: 800 }
                    ]
                });
            } else {
                // Default Natural Interaction
                this.attention.lookAt('USER', 1, 2000);
                this.emotion.transitionTo(emotion, intensity, 200);
                this.gesture.playForIntent(intent, 1500);
            }
        }

        inferIntentFromDecision(decision) {
            const emo = decision.emotion || 'happy';
            const anim = decision.animation || 'idle';

            if (anim === 'wave') return 'greeting';
            if (anim === 'celebrate') return 'celebration';
            if (anim === 'point') return 'recommendation';
            if (emo === 'worried' || emo === 'surprised') return 'warning';
            if (emo === 'thinking') return 'thinking';
            return 'greeting';
        }

        lookAt(target = 'USER', priority = 1, duration = 0) {
            return this.attention.lookAt(target, priority, duration);
        }

        setEmotion(emotion = 'neutral', intensity = 0.6) {
            this.emotion.transitionTo(emotion, intensity);
        }

        playGesture(gesture = 'wave', duration = 2000) {
            return this.gesture.play(gesture, duration);
        }

        getState() {
            return {
                emotion: this.emotion.getEmotionState(),
                attention: this.attention.getTarget(),
                gesture: this.gesture.getGesture(),
                idleRunning: this.idle.isRunning,
                lastIntent: this.lastIntent,
                sequencer: this.sequencer.getStatus()
            };
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.getState());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const st = this.getState();
            for (const l of this.listeners) {
                try {
                    l(st);
                } catch (e) {}
            }
        }

        destroy() {
            this.attention.destroy();
            this.idle.destroy();
            this.sequencer.destroy();
            this.listeners.clear();
        }
    }

    const buddyBehavior = new BuddyBehaviorEngine();

    global.BuddyBehaviorEngine = BuddyBehaviorEngine;
    global.buddyBehavior = buddyBehavior;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyBehaviorEngine,
            buddyBehavior
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
