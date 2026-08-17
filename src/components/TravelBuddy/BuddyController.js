/**
 * Travel AI Buddy — Controller & State Machine
 */
(function (global) {
    class BuddyController {
        constructor(scene, animationManager, config = {}) {
            this.scene = scene;
            this.animations = animationManager;
            this.config = config;

            this.state = {
                visible: config.initialState?.visible ?? true,
                emotion: config.initialState?.emotion ?? 'neutral',
                animation: config.initialState?.animation ?? 'idle',
                speaking: config.initialState?.speaking ?? false
            };

            this.stateListeners = new Set();
            this.animationTimer = null;
            this.isLocked = false;
        }

        onStateChange(callback) {
            this.stateListeners.add(callback);
            callback({ ...this.state });
            return () => this.stateListeners.delete(callback);
        }

        notifyState() {
            const stateCopy = { ...this.state };
            for (const listener of this.stateListeners) {
                try {
                    listener(stateCopy);
                } catch (err) {
                    console.error('[TravelBuddy] Error in state listener:', err);
                }
            }
        }

        getState() {
            return { ...this.state };
        }

        show() {
            this.state.visible = true;
            if (this.scene) {
                this.scene.setVisible(true);
            }
            this.notifyState();
        }

        hide() {
            this.state.visible = false;
            if (this.scene) {
                this.scene.setVisible(false);
            }
            this.notifyState();
        }

        toggle() {
            if (this.state.visible) {
                this.hide();
            } else {
                this.show();
            }
        }

        setEmotion(emotion) {
            const supported = this.config.emotions || ['neutral', 'happy', 'sad', 'surprised', 'thinking', 'excited'];
            if (!supported.includes(emotion)) {
                console.warn(`[TravelBuddy] Emotion "${emotion}" not supported. Using "neutral".`);
                emotion = 'neutral';
            }

            this.state.emotion = emotion;
            if (this.scene) {
                this.scene.updateFacialExpression(emotion);
            }
            this.notifyState();
        }

        play(animName, customDuration = null) {
            if (!this.animations.hasAnimation(animName)) {
                console.warn(`[TravelBuddy] Animation "${animName}" not found. Falling back to idle.`);
                this.play('idle');
                return false;
            }

            const animMeta = this.animations.getAnimation(animName);

            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }

            this.state.animation = animName;
            if (animMeta.emotion) {
                this.state.emotion = animMeta.emotion;
            }

            if (this.scene) {
                this.scene.applyState(this.state.animation, this.state.emotion);
            }
            this.notifyState();

            if (!animMeta.isLoop) {
                const duration = customDuration ?? animMeta.duration ?? 2000;
                this.animationTimer = setTimeout(() => {
                    this.returnToIdle();
                }, duration);
            }

            return true;
        }

        returnToIdle() {
            this.state.animation = 'idle';
            this.state.emotion = 'neutral';
            if (this.scene) {
                this.scene.applyState('idle', 'neutral');
            }
            this.notifyState();
        }

        setSpeaking(isSpeaking) {
            this.state.speaking = Boolean(isSpeaking);
            if (this.scene) {
                this.scene.setSpeaking(this.state.speaking);
            }
            this.notifyState();
        }

        say(text, duration = 3000) {
            if (!text) return;
            this.state.speaking = true;
            this.notifyState();

            if (this.scene) {
                this.scene.showSpeech(text, duration);
            }

            if (duration > 0) {
                setTimeout(() => {
                    this.state.speaking = false;
                    this.notifyState();
                }, duration);
            }
        }

        handleEvent(eventName, eventData = null) {
            const reactions = this.config.reactions || {};
            const reaction = reactions[eventName];

            if (!reaction) {
                console.log(`[TravelBuddy] No configured reaction for event: "${eventName}"`);
                return;
            }

            console.log(`[TravelBuddy] Reacting to "${eventName}":`, reaction);

            if (reaction.animation) {
                this.play(reaction.animation);
            }

            if (reaction.emotion) {
                this.setEmotion(reaction.emotion);
            }

            if (reaction.caption) {
                const captionText = typeof reaction.caption === 'function'
                    ? reaction.caption(eventData)
                    : reaction.caption;
                this.say(captionText, 3000);
            }
        }

        destroy() {
            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }
            this.stateListeners.clear();
        }
    }

    global.BuddyController = BuddyController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyController;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
