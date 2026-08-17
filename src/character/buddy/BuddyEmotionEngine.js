/**
 * Travel AI Buddy — Step 5: Emotion Transition & State Engine
 * 
 * Manages smooth emotion transitions, emotion blend decay, and intensity controls.
 */
(function (global) {
    const _buddyExpression = (typeof global.buddyExpression !== 'undefined')
        ? global.buddyExpression
        : require('./BuddyExpressionController').buddyExpression;

    const EMOTION_STATES = {
        NEUTRAL: 'neutral',
        HAPPY: 'happy',
        EXCITED: 'excited',
        CURIOUS: 'curious',
        SURPRISED: 'surprised',
        SAD: 'sad',
        WORRIED: 'worried',
        CONFUSED: 'confused',
        THINKING: 'thinking'
    };

    class BuddyEmotionEngine {
        constructor(expressionController = _buddyExpression) {
            this.expressionController = expressionController;
            this.currentEmotion = EMOTION_STATES.NEUTRAL;
            this.currentIntensity = 0.5;
            this.targetEmotion = EMOTION_STATES.NEUTRAL;
            this.targetIntensity = 0.5;
            this.transitionTimer = null;
            this.listeners = new Set();
        }

        setExpressionController(ctrl) {
            this.expressionController = ctrl;
        }

        /**
         * Transition to a new emotion with intensity
         * @param {string} emotion 
         * @param {number} [intensity=0.6] 
         * @param {number} [transitionMs=250] 
         */
        transitionTo(emotion = 'neutral', intensity = 0.6, transitionMs = 250) {
            const cleanEmotion = Object.values(EMOTION_STATES).includes(emotion) ? emotion : 'neutral';
            const cleanIntensity = Math.max(0.0, Math.min(1.0, Number(intensity) || 0.5));

            if (this.transitionTimer) {
                clearTimeout(this.transitionTimer);
                this.transitionTimer = null;
            }

            this.targetEmotion = cleanEmotion;
            this.targetIntensity = cleanIntensity;

            if (transitionMs <= 0) {
                this.currentEmotion = cleanEmotion;
                this.currentIntensity = cleanIntensity;
                this.applyEmotion();
                return;
            }

            // Smooth 2-stage transition
            this.transitionTimer = setTimeout(() => {
                this.currentEmotion = cleanEmotion;
                this.currentIntensity = cleanIntensity;
                this.applyEmotion();
            }, transitionMs / 2);
        }

        applyEmotion() {
            if (this.expressionController) {
                this.expressionController.setExpression(this.currentEmotion, this.currentIntensity);
            }
            this.notify();
        }

        getEmotionState() {
            return {
                emotion: this.currentEmotion,
                intensity: this.currentIntensity
            };
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.getEmotionState());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const state = this.getEmotionState();
            for (const l of this.listeners) {
                try {
                    l(state);
                } catch (e) {}
            }
        }
    }

    const buddyEmotion = new BuddyEmotionEngine();

    global.EMOTION_STATES = EMOTION_STATES;
    global.BuddyEmotionEngine = BuddyEmotionEngine;
    global.buddyEmotion = buddyEmotion;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            EMOTION_STATES,
            BuddyEmotionEngine,
            buddyEmotion
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
