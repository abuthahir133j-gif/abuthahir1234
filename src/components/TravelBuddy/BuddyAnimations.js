/**
 * Travel AI Buddy — Animation & Emotion Manager
 */
(function (global) {
    class BuddyAnimations {
        constructor(config = {}) {
            this.config = config.animations || {
                idle: { duration: 0, isLoop: true, emotion: 'neutral' },
                wave: { duration: 2400, isLoop: false, emotion: 'happy' },
                happy: { duration: 2000, isLoop: false, emotion: 'happy' },
                sad: { duration: 2600, isLoop: false, emotion: 'sad' },
                surprised: { duration: 2200, isLoop: false, emotion: 'surprised' },
                thinking: { duration: 2800, isLoop: false, emotion: 'thinking' },
                excited: { duration: 2400, isLoop: false, emotion: 'excited' },
                celebrate: { duration: 3200, isLoop: false, emotion: 'excited' },
                point: { duration: 2200, isLoop: false, emotion: 'neutral' }
            };

            this.currentAnimation = 'idle';
            this.currentEmotion = 'neutral';
            this.timer = null;

            this.facePresets = {
                neutral: {
                    leftEye: '<path d="M 252 176 L 284 176 A 16 15 0 0 0 252 176 Z" fill="url(#cyanGlowGrad)"/>',
                    rightEye: '<path d="M 316 176 L 348 176 A 16 15 0 0 0 316 176 Z" fill="url(#cyanGlowGrad)"/>',
                    mouth: '<path d="M 292 186 C 292 196 308 196 308 186 Z" fill="url(#cyanGlowGrad)"/>',
                    visorTint: '#0E2032',
                    visorGlow: '#1B5B85'
                },
                happy: {
                    leftEye: '<path d="M 250 178 C 250 162 286 162 286 178" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="6" stroke-linecap="round"/>',
                    rightEye: '<path d="M 314 178 C 314 162 350 162 350 178" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="6" stroke-linecap="round"/>',
                    mouth: '<path d="M 288 184 C 288 202 312 202 312 184 Z" fill="url(#cyanGlowGrad)"/>',
                    visorTint: '#0B243B',
                    visorGlow: '#227FB8'
                },
                sad: {
                    leftEye: '<path d="M 252 168 L 284 176 A 16 15 0 0 1 252 168 Z" fill="url(#cyanGlowGrad)" opacity="0.85"/>',
                    rightEye: '<path d="M 348 168 L 316 176 A 16 15 0 0 0 348 168 Z" fill="url(#cyanGlowGrad)" opacity="0.85"/>',
                    mouth: '<path d="M 292 194 C 292 186 308 186 308 194 Z" fill="url(#cyanGlowGrad)" opacity="0.8"/>',
                    visorTint: '#0A1524',
                    visorGlow: '#12395C'
                },
                surprised: {
                    leftEye: '<circle cx="268" cy="174" r="14" fill="url(#cyanGlowGrad)"/>',
                    rightEye: '<circle cx="332" cy="174" r="14" fill="url(#cyanGlowGrad)"/>',
                    mouth: '<ellipse cx="300" cy="192" rx="9" ry="11" fill="url(#cyanGlowGrad)"/>',
                    visorTint: '#071828',
                    visorGlow: '#2FA8DB'
                },
                thinking: {
                    leftEye: '<ellipse cx="270" cy="168" rx="14" ry="11" fill="url(#cyanGlowGrad)" transform="rotate(-10 270 168)"/>',
                    rightEye: '<ellipse cx="334" cy="166" rx="16" ry="13" fill="url(#cyanGlowGrad)" transform="rotate(12 334 166)"/>',
                    mouth: '<path d="M 292 190 Q 300 186 308 192" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="4.5" stroke-linecap="round"/>',
                    visorTint: '#0D1E30',
                    visorGlow: '#1A6796'
                },
                excited: {
                    leftEye: '<polygon points="268,158 273,169 285,170 276,178 279,190 268,183 257,190 260,178 251,170 263,169" fill="url(#cyanGlowGrad)"/>',
                    rightEye: '<polygon points="332,158 337,169 349,170 340,178 343,190 332,183 321,190 324,178 315,170 327,169" fill="url(#cyanGlowGrad)"/>',
                    mouth: '<path d="M 286 182 C 286 206 314 206 314 182 Z" fill="url(#cyanGlowGrad)"/>',
                    visorTint: '#0A2D48',
                    visorGlow: '#38C8F7'
                },
                curious: {
                    leftEye: '<circle cx="268" cy="172" r="14" fill="url(#cyanGlowGrad)"/>',
                    rightEye: '<path d="M 314 178 C 314 162 350 162 350 178" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="5" stroke-linecap="round"/>',
                    mouth: '<path d="M 292 188 Q 300 184 308 190" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="4" stroke-linecap="round"/>',
                    visorTint: '#0E2436',
                    visorGlow: '#2290C8'
                },
                confused: {
                    leftEye: '<ellipse cx="268" cy="174" rx="14" ry="10" fill="url(#cyanGlowGrad)" transform="rotate(-15 268 174)"/>',
                    rightEye: '<circle cx="332" cy="170" r="14" fill="url(#cyanGlowGrad)"/>',
                    mouth: '<path d="M 290 192 Q 298 184 310 190" fill="none" stroke="url(#cyanGlowGrad)" stroke-width="4.5" stroke-linecap="round"/>',
                    visorTint: '#0E1D2D',
                    visorGlow: '#1B6594'
                },
                worried: {
                    leftEye: '<path d="M 252 166 L 284 174 A 16 15 0 0 1 252 166 Z" fill="url(#cyanGlowGrad)" opacity="0.9"/>',
                    rightEye: '<path d="M 348 166 L 316 174 A 16 15 0 0 0 348 166 Z" fill="url(#cyanGlowGrad)" opacity="0.9"/>',
                    mouth: '<ellipse cx="300" cy="192" rx="7" ry="6" fill="url(#cyanGlowGrad)"/>',
                    visorTint: '#091A2B',
                    visorGlow: '#154B76'
                }
            };
        }

        hasAnimation(name) {
            return Boolean(this.config[name]);
        }

        getAnimation(name) {
            return this.config[name] || null;
        }

        getAvailableAnimations() {
            return Object.keys(this.config);
        }

        getFaceFeatures(emotion = 'neutral') {
            return this.facePresets[emotion] || this.facePresets.neutral;
        }

        clearTimer() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }
    }

    global.BuddyAnimations = BuddyAnimations;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyAnimations;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
