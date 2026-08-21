/**
 * Travel AI Buddy — Step 5: Facial Expression & Morph Controller
 * 
 * Manages character facial features, intensity scaling (0.0 to 1.0),
 * eye blinks, and visor glows.
 */
(function (global) {
    class BuddyExpressionController {
        constructor(scene = null, animationManager = null) {
            this.scene = scene;
            this.animations = animationManager;

            this.currentEmotion = 'neutral';
            this.currentIntensity = 0.5; // default 0.5 (range 0.0 to 1.0)
            this.isBlinking = false;
            this.listeners = new Set();
        }

        setScene(scene) {
            this.scene = scene;
        }

        setAnimationManager(animManager) {
            this.animations = animManager;
        }

        /**
         * Set facial expression with intensity scaling
         * @param {string} emotion ('neutral'|'happy'|'excited'|'curious'|'surprised'|'sad'|'worried'|'confused'|'thinking')
         * @param {number} [intensity=0.6] (0.0 to 1.0)
         */
        setExpression(emotion = 'neutral', intensity = 0.6) {
            this.currentEmotion = emotion;
            this.currentIntensity = Math.max(0.0, Math.min(1.0, Number(intensity) || 0.5));

            this.applyExpressionToScene();
            this.notify();
        }

        applyExpressionToScene() {
            if (!this.scene || !this.scene.characterElement) return;

            // 1. If blinking, render closed eyes
            if (this.isBlinking) {
                this.renderBlinkEyes();
                return;
            }

            // 2. If rig is present, update facial expression on the locked character
            if (this.scene.rig) {
                this.scene.updateFacialExpression(this.currentEmotion);
                return;
            }

            // 3. Fallback to face features if direct group present
            if (this.animations && typeof this.animations.getFaceFeatures === 'function') {
                const preset = this.animations.getFaceFeatures(this.currentEmotion);
                if (preset) {
                    const faceGroup = this.scene.characterElement.querySelector('#buddy-face-features') || this.scene.characterElement.querySelector('#face-features');
                    if (faceGroup) {
                        faceGroup.innerHTML = `${preset.leftEye}\n${preset.rightEye}\n${preset.mouth}`;
                    }
                }
            }

            // 3. Intensity Visual Scaling (glow effect on character visor / frame)
            const head = this.scene.characterElement.querySelector('#head') || this.scene.characterElement.querySelector('svg') || this.scene.characterElement;
            if (head) {
                const glowIntensity = Math.round(this.currentIntensity * 12);
                head.style.filter = `drop-shadow(0 0 ${glowIntensity}px rgba(56, 189, 248, ${0.2 + this.currentIntensity * 0.4}))`;
            }
        }

        /**
         * Trigger a temporary natural blink
         * @param {number} [duration=140] (ms)
         */
        blink(duration = 140) {
            if (this.isBlinking) return;
            this.isBlinking = true;
            this.renderBlinkEyes();

            setTimeout(() => {
                this.isBlinking = false;
                this.applyExpressionToScene();
            }, duration);
        }

        renderBlinkEyes() {
            if (!this.scene || !this.scene.characterElement) return;
            const faceGroup = this.scene.characterElement.querySelector('#face-features');
            if (faceGroup) {
                faceGroup.innerHTML = `
                    <path d="M 252 176 L 284 176" stroke="url(#cyanGlowGrad)" stroke-width="4.5" stroke-linecap="round"/>
                    <path d="M 316 176 L 348 176" stroke="url(#cyanGlowGrad)" stroke-width="4.5" stroke-linecap="round"/>
                    <path d="M 292 186 C 292 192 308 192 308 186 Z" fill="url(#cyanGlowGrad)"/>
                `;
            }
        }

        getExpression() {
            return {
                emotion: this.currentEmotion,
                intensity: this.currentIntensity
            };
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.getExpression());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const exp = this.getExpression();
            for (const l of this.listeners) {
                try {
                    l(exp);
                } catch (e) {}
            }
        }
    }

    const buddyExpression = new BuddyExpressionController();

    global.BuddyExpressionController = BuddyExpressionController;
    global.buddyExpression = buddyExpression;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyExpressionController,
            buddyExpression
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
