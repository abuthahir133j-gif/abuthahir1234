/**
 * Travel AI Buddy — Step 5: Gesture Controller & Intent-to-Gesture Mapping
 * 
 * Manages physical character gestures (independent of speech), gesture durations,
 * and maps AI conversational intents into physical gestures.
 */
(function (global) {
    const GESTURES = {
        IDLE: 'idle',
        WAVE: 'wave',
        POINT: 'point',
        THUMBS_UP: 'happy',
        SHRUG: 'thinking',
        CLAP: 'celebrate',
        CELEBRATE: 'celebrate',
        THINK: 'thinking',
        LOOK_AROUND: 'idle',
        WARNING: 'surprised'
    };

    const INTENT_TO_GESTURE = {
        greeting: GESTURES.WAVE,
        welcome: GESTURES.WAVE,
        recommendation: GESTURES.POINT,
        discovery: GESTURES.POINT,
        warning: GESTURES.WARNING,
        celebration: GESTURES.CELEBRATE,
        encouragement: GESTURES.CELEBRATE,
        question: GESTURES.THINK,
        thinking: GESTURES.THINK,
        confirmation: GESTURES.THUMBS_UP,
        farewell: GESTURES.WAVE,
        silence: GESTURES.IDLE,
        none: GESTURES.IDLE
    };

    class BuddyGestureController {
        constructor(controller = null) {
            this.controller = controller;
            this.currentGesture = GESTURES.IDLE;
            this.activeTimer = null;
            this.listeners = new Set();
        }

        setController(ctrl) {
            this.controller = ctrl;
        }

        /**
         * Play a gesture
         * @param {string} gestureKey 
         * @param {number} [duration=2000] 
         * @returns {boolean}
         */
        play(gestureKey = GESTURES.IDLE, duration = 2000) {
            const mappedAnim = GESTURES[gestureKey.toUpperCase()] || gestureKey;

            if (this.activeTimer) {
                clearTimeout(this.activeTimer);
                this.activeTimer = null;
            }

            this.currentGesture = gestureKey;
            this.notify();

            if (this.controller && typeof this.controller.play === 'function') {
                this.controller.play(mappedAnim, duration);
            }

            if (duration > 0 && mappedAnim !== 'idle') {
                this.activeTimer = setTimeout(() => {
                    this.currentGesture = GESTURES.IDLE;
                    this.notify();
                }, duration);
            }

            return true;
        }

        /**
         * Play gesture appropriate for a conversational intent
         * @param {string} intent ('greeting'|'recommendation'|'warning'|'celebration'|'thinking'|etc.)
         * @param {number} [duration=2000]
         */
        playForIntent(intent = 'recommendation', duration = 2000) {
            const gesture = INTENT_TO_GESTURE[intent] || GESTURES.IDLE;
            if (gesture === GESTURES.IDLE) return;
            this.play(gesture, duration);
        }

        getGesture() {
            return this.currentGesture;
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.currentGesture);
            return () => this.listeners.delete(listener);
        }

        notify() {
            for (const l of this.listeners) {
                try {
                    l(this.currentGesture);
                } catch (e) {}
            }
        }
    }

    const buddyGesture = new BuddyGestureController();

    global.GESTURES = GESTURES;
    global.INTENT_TO_GESTURE = INTENT_TO_GESTURE;
    global.BuddyGestureController = BuddyGestureController;
    global.buddyGesture = buddyGesture;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            GESTURES,
            INTENT_TO_GESTURE,
            BuddyGestureController,
            buddyGesture
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
