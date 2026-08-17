/**
 * Travel AI Buddy — Step 5: Action Sequencer & Cinematic Queue
 * 
 * Orchestrates multi-step behavioral sequences (e.g. Look At -> Change Emotion ->
 * Gesture -> Speak -> Return to Idle) with priority preemption and cancellation.
 */
(function (global) {
    const _buddyAttention = (typeof global.buddyAttention !== 'undefined')
        ? global.buddyAttention
        : require('./BuddyAttention').buddyAttention;

    const _buddyEmotion = (typeof global.buddyEmotion !== 'undefined')
        ? global.buddyEmotion
        : require('./BuddyEmotionEngine').buddyEmotion;

    const _buddyGesture = (typeof global.buddyGesture !== 'undefined')
        ? global.buddyGesture
        : require('./BuddyGestureController').buddyGesture;

    const _buddyIdle = (typeof global.buddyIdle !== 'undefined')
        ? global.buddyIdle
        : require('./BuddyIdleController').buddyIdle;

    class BuddyActionSequencer {
        constructor(attention = _buddyAttention, emotion = _buddyEmotion, gesture = _buddyGesture, idle = _buddyIdle) {
            this.attention = attention;
            this.emotion = emotion;
            this.gesture = gesture;
            this.idle = idle;

            this.currentSequence = null;
            this.currentPriority = 0;
            this.isRunning = false;
            this.stepTimer = null;
            this.queue = [];
            this.listeners = new Set();
        }

        setEngines(attention, emotion, gesture, idle) {
            this.attention = attention;
            this.emotion = emotion;
            this.gesture = gesture;
            this.idle = idle;
        }

        /**
         * Run or queue a cinematic action sequence
         * @param {Object} sequenceDef { name, priority, steps: [...] }
         * @returns {Promise<boolean>}
         */
        async runSequence(sequenceDef) {
            if (!sequenceDef || !Array.isArray(sequenceDef.steps) || sequenceDef.steps.length === 0) {
                return false;
            }

            const priority = sequenceDef.priority ?? 1;

            // 1. If currently running a lower-priority sequence, cancel it
            if (this.isRunning && priority > this.currentPriority) {
                console.log(`[BuddyActionSequencer] Preempting sequence "${this.currentSequence?.name}" for higher-priority "${sequenceDef.name}"`);
                this.cancel();
            } else if (this.isRunning) {
                // Queue if normal priority
                this.queue.push(sequenceDef);
                this.notify();
                return false;
            }

            this.isRunning = true;
            this.currentPriority = priority;
            this.currentSequence = sequenceDef;
            this.idle?.pause();
            this.notify();

            // Execute steps sequentially
            for (let i = 0; i < sequenceDef.steps.length; i++) {
                if (!this.isRunning || this.currentSequence !== sequenceDef) {
                    break; // was cancelled
                }

                const step = sequenceDef.steps[i];
                await this.executeStep(step);
            }

            this.isRunning = false;
            this.currentSequence = null;
            this.currentPriority = 0;
            this.notify();

            // Process next in queue or resume idle
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                this.runSequence(next);
            } else {
                this.idle?.resume();
            }

            return true;
        }

        executeStep(step) {
            return new Promise((resolve) => {
                const action = step.action;
                const duration = step.duration || 300;

                switch (action) {
                    case 'lookAt':
                        this.attention?.lookAt(step.target || 'USER', step.priority || 2, duration);
                        break;

                    case 'emotion':
                        this.emotion?.transitionTo(step.value || 'neutral', step.intensity || 0.6, 200);
                        break;

                    case 'gesture':
                        this.gesture?.play(step.value || 'idle', duration);
                        break;

                    case 'speak':
                        // If speech callback provided
                        if (typeof step.onSpeak === 'function') {
                            step.onSpeak();
                        }
                        break;

                    default:
                        break;
                }

                this.stepTimer = setTimeout(() => {
                    this.stepTimer = null;
                    resolve();
                }, duration);
            });
        }

        /**
         * Cancel the currently executing sequence immediately
         */
        cancel() {
            if (this.stepTimer) {
                clearTimeout(this.stepTimer);
                this.stepTimer = null;
            }
            this.isRunning = false;
            this.currentSequence = null;
            this.currentPriority = 0;
            this.notify();
        }

        getStatus() {
            return {
                isRunning: this.isRunning,
                currentSequence: this.currentSequence?.name || 'NONE',
                queueLength: this.queue.length
            };
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.getStatus());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const status = this.getStatus();
            for (const l of this.listeners) {
                try {
                    l(status);
                } catch (e) {}
            }
        }

        destroy() {
            this.cancel();
            this.queue = [];
            this.listeners.clear();
        }
    }

    const buddyActionSequencer = new BuddyActionSequencer();

    global.BuddyActionSequencer = BuddyActionSequencer;
    global.buddyActionSequencer = buddyActionSequencer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyActionSequencer,
            buddyActionSequencer
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
