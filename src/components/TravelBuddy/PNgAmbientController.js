/**
 * Travel AI Buddy — PNg Exclusive Bird Interaction Controller
 * 
 * SPECIFIC CHARACTER SCOPE:
 * ONLY active for AI-Buddy Character 1 ("PNg").
 * Characters 2, 3, 4, 5, and 6 are strictly EXCLUDED.
 * 
 * Master Sequence:
 * BIRD ENTERS
 *      ↓
 * BIRD CIRCLES PNg (organic curved path)
 *      ↓
 * BIRD LANDS ON PNg'S HAND (perches on outstretched hand)
 *      ↓
 * PNg NOTICES THE BIRD (turns head, eyes focus on hand)
 *      ↓
 * PNg INTERACTS / GENTLY TOUCHES THE BIRD (friendly playful greeting)
 *      ↓
 * BIRD FLIES AWAY (crouch anticipation, wing flap, takeoff soar)
 *      ↓
 * WAIT EXACTLY 5 SECONDS
 *      ↓
 * NEW BIRD INTERACTION
 *      ↓
 * REPEAT
 */

(function (global) {
    'use strict';

    // Strict PNg Character Asset Verification
    function isPngAsset(assetPath) {
        if (!assetPath || typeof assetPath !== 'string') return false;
        const normalized = assetPath.replace(/\\/g, '/').toLowerCase();
        return normalized.includes('png') && 
               !normalized.includes('ice blue') && 
               !normalized.includes('purple') && 
               !normalized.includes('green') && 
               !normalized.includes('gold') && 
               !normalized.includes('red');
    }

    // Bird Vector SVG with Dual Wings (Flapping in flight + Folded while perched on hand) + Gripping Feet
    function createBirdSvgMarkup(uniqueId) {
        return `
            <svg viewBox="0 0 70 60" width="100%" height="100%" class="bird-svg-element" id="${uniqueId}">
                <defs>
                    <linearGradient id="birdBlueGrad_${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#38bdf8"/>
                        <stop offset="45%" stop-color="#0ea5e9"/>
                        <stop offset="100%" stop-color="#0284c7"/>
                    </linearGradient>
                    <linearGradient id="birdBellyGrad_${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fef08a"/>
                        <stop offset="60%" stop-color="#f59e0b"/>
                        <stop offset="100%" stop-color="#d97706"/>
                    </linearGradient>
                    <linearGradient id="birdWingGrad_${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#60a5fa"/>
                        <stop offset="60%" stop-color="#2563eb"/>
                        <stop offset="100%" stop-color="#1d4ed8"/>
                    </linearGradient>
                </defs>

                <!-- Bird Feet (Perching claws that visibly rest on PNg's hand) -->
                <g class="bird-feet">
                    <path d="M 28 47 L 28 54 M 25 54 L 31 54" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M 36 47 L 36 54 M 33 54 L 39 54" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/>
                </g>

                <!-- Tail Feathers -->
                <g class="bird-tail-group">
                    <path d="M 16 35 L 3 41 L 10 32 Z" fill="#0369a1"/>
                    <path d="M 17 37 L 6 45 L 12 36 Z" fill="#0284c7"/>
                </g>

                <!-- Main Bird Body -->
                <ellipse cx="32" cy="34" rx="18" ry="14" fill="url(#birdBlueGrad_${uniqueId})"/>

                <!-- Golden Warm Breast/Belly -->
                <path d="M 28 29 Q 34 46 45 38 Q 36 47 28 29 Z" fill="url(#birdBellyGrad_${uniqueId})"/>

                <!-- Bird Head Assembly -->
                <g class="bird-head-group">
                    <circle cx="48" cy="24" r="10.5" fill="url(#birdBlueGrad_${uniqueId})"/>
                    <!-- Cute Eye -->
                    <circle cx="51" cy="22" r="2.8" fill="#ffffff"/>
                    <circle cx="52" cy="21.5" r="1.5" fill="#0f172a"/>
                    <circle cx="52.6" cy="20.8" r="0.6" fill="#ffffff"/>
                    <!-- Cheerful Golden Beak -->
                    <path d="M 57 23 L 67 26.5 L 57 29.5 Z" fill="#ea580c"/>
                </g>

                <!-- Wing Group 1: Flapping Wings (Visible during flight & takeoff) -->
                <g class="bird-wing-flight">
                    <path d="M 27 28 Q 16 8 38 20 Q 32 36 27 28 Z" fill="url(#birdWingGrad_${uniqueId})"/>
                    <path d="M 24 30 Q 18 16 33 24" stroke="#93c5fd" stroke-width="1" fill="none" opacity="0.6"/>
                </g>

                <!-- Wing Group 2: Folded Wings (Visible while sitting calmly on PNg's hand) -->
                <g class="bird-wing-perched">
                    <path d="M 24 28 C 22 25 38 26 40 33 C 36 41 24 39 20 37 Z" fill="url(#birdWingGrad_${uniqueId})"/>
                    <path d="M 23 30 C 26 28 36 30 37 34" stroke="#93c5fd" stroke-width="1.1" fill="none" opacity="0.7"/>
                </g>
            </svg>
        `;
    }

    class PNgAmbientController {
        constructor(scene, options = {}) {
            this.scene = scene;
            this.options = options;

            this.postDepartureWaitMs = 5000; // WAIT EXACTLY 5 SECONDS after bird flies away

            this.isActive = false;
            this.loopTimer = null;
            this.activeBirdElement = null;
            this.activeTimers = [];

            this.containerElement = null;
            this.currentActiveAsset = null;
            this.boundTick = this.startInteractionCycle.bind(this);
        }

        init() {
            this.resolveAsset();
            console.log(`[PNgAmbientController] Initialized for active asset: "${this.currentActiveAsset}"`);
            if (isPngAsset(this.currentActiveAsset)) {
                this.start();
            } else {
                this.stop();
            }
        }

        resolveAsset() {
            let asset = null;
            if (this.scene?.config?.character?.asset) {
                asset = this.scene.config.character.asset;
            } else if (typeof global !== 'undefined' && typeof global.getBuddyAvatarForProgress === 'function') {
                asset = global.getBuddyAvatarForProgress();
            }
            this.currentActiveAsset = asset || 'AI/PNg.svg';
            return this.currentActiveAsset;
        }

        onCharacterAssetChanged(newAsset) {
            const wasActive = this.isActive;
            const previousAsset = this.currentActiveAsset;
            this.currentActiveAsset = newAsset;

            if (isPngAsset(newAsset)) {
                console.log(`[PNgAmbientController] Active asset "${newAsset}" is Character 1 (PNg) -> Enabling Hand Bird Interaction.`);
                this.start();
            } else {
                if (wasActive) {
                    console.log(`[PNgAmbientController] Active asset "${newAsset}" is NOT Character 1 -> Disabling Hand Bird Interaction.`);
                }
                this.stop();
            }
        }

        start() {
            if (this.isActive) return;
            if (!isPngAsset(this.resolveAsset())) return;

            this.isActive = true;
            console.log(`[PNgAmbientController] Hand-Landing Bird Interaction ACTIVE for Character 1 ("PNg"). First visit arriving in 2.5s...`);

            if (this.scene?.characterElement) {
                this.scene.characterElement.classList.add('png-bird-system-enabled');
            }

            // Start initial interaction after 2.5s
            this.scheduleNextCycle(2500);
        }

        stop() {
            this.isActive = false;

            if (this.loopTimer) {
                clearTimeout(this.loopTimer);
                this.loopTimer = null;
            }

            this.clearActiveTimers();
            this.removeBird();
            this.resetCharacterState();
        }

        scheduleNextCycle(delayMs = 5000) {
            if (!this.isActive) return;
            if (this.loopTimer) {
                clearTimeout(this.loopTimer);
                this.loopTimer = null;
            }
            this.loopTimer = setTimeout(this.boundTick, delayMs);
        }

        clearActiveTimers() {
            for (const timer of this.activeTimers) {
                clearTimeout(timer);
            }
            this.activeTimers = [];
        }

        addTimer(fn, ms) {
            const timer = setTimeout(() => {
                const idx = this.activeTimers.indexOf(timer);
                if (idx !== -1) this.activeTimers.splice(idx, 1);
                fn();
            }, ms);
            this.activeTimers.push(timer);
            return timer;
        }

        resetCharacterState() {
            const charWrap = this.scene?.characterElement;
            const rig = this.scene?.rig;

            if (charWrap) {
                charWrap.classList.remove(
                    'png-bird-system-enabled',
                    'png-perch-ready',
                    'png-notice-bird',
                    'png-interact-bird',
                    'png-watch-departure',
                    'png-idle-restore'
                );
            }

            if (rig) {
                rig.resetPart('head');
                rig.resetPart('face');
                rig.resetPart('leftEye');
                rig.resetPart('rightEye');
                rig.resetPart('mouth');
                rig.resetPart('rightArm');
                rig.resetPart('leftArm');
            }
        }

        startInteractionCycle() {
            if (!this.isActive || !isPngAsset(this.currentActiveAsset)) {
                this.stop();
                return;
            }

            this.executeBirdInteraction();
        }

        /**
         * Orchestrates the complete sequence:
         * 1. Bird Enters
         * 2. Bird Circles PNg
         * 3. Bird Lands on PNg's Hand (Arm prepares perch)
         * 4. PNg Notices the Bird (Head turns, eyes gaze at hand)
         * 5. PNg Interacts with Bird (Gentle petting gesture, happy reaction, bird chirps)
         * 6. Bird Flies Away (Takeoff, soaring departure)
         * 7. 5 Second Wait -> Next interaction!
         */
        executeBirdInteraction() {
            const root = this.scene?.rootElement || document.getElementById('travel-buddy-root');
            const charWrap = this.scene?.characterElement;
            const rig = this.scene?.rig;
            if (!root || !charWrap) return;

            // Clean up any stray bird if existing
            this.removeBird();

            // Randomize entrance flight profile for natural variety (Top-Right Swoop vs Top-Left Loop)
            const entranceType = Math.random() < 0.5 ? 'flight-entrance-curve-right' : 'flight-entrance-curve-left';

            // Create bird DOM node
            const birdEl = document.createElement('div');
            const uniqueId = `bird_${Date.now()}`;
            birdEl.id = uniqueId;
            birdEl.className = `png-interaction-bird ${entranceType}`;
            birdEl.innerHTML = createBirdSvgMarkup(uniqueId);
            charWrap.appendChild(birdEl);
            this.activeBirdElement = birdEl;

            // =========================================================================
            // STEP 1 & 2: BIRD ENTERS & CIRCLES PNg (0.0s - 3.2s)
            // =========================================================================
            console.log('[PNgAmbientController] 🐦 Step 1 & 2: Bird entering scene from map and circling around PNg...');

            // =========================================================================
            // STEP 3: PNg OFFERS HAND & BIRD APPROACHES TO LAND (2.6s - 3.4s)
            // =========================================================================
            this.addTimer(() => {
                if (!this.isActive || !this.activeBirdElement) return;

                console.log('[PNgAmbientController] 🖐️ Step 3a: PNg raising right hand into perch pose...');
                charWrap.classList.add('png-perch-ready');

                if (rig) {
                    // Lift right arm smoothly into receiving landing position
                    rig.setTransform('rightArm', { rotation: -36, x: 12, y: -22 });
                }
            }, 2600);

            // =========================================================================
            // STEP 3 (CONT.): BIRD LANDS SPECIFICALLY ON PNg'S HAND (3.4s)
            // =========================================================================
            this.addTimer(() => {
                if (!this.isActive || !this.activeBirdElement) return;

                console.log('[PNgAmbientController] ✨ Step 3b: Bird landed directly ON PNg\'s hand!');
                this.activeBirdElement.classList.remove('flight-entrance-curve-right', 'flight-entrance-curve-left');
                this.activeBirdElement.classList.add('bird-perched-on-hand', 'bird-landing-hop');

                // Remove landing hop after 400ms (settled on hand)
                this.addTimer(() => {
                    if (this.activeBirdElement) {
                        this.activeBirdElement.classList.remove('bird-landing-hop');
                    }
                }, 400);
            }, 3400);

            // =========================================================================
            // STEP 4: PNg NOTICES THE BIRD ON ITS HAND (3.8s - 5.0s)
            // =========================================================================
            this.addTimer(() => {
                if (!this.isActive || !this.activeBirdElement) return;

                console.log('[PNgAmbientController] 👀 Step 4: PNg noticed the bird, turning head & gazing at hand!');
                charWrap.classList.add('png-notice-bird');

                if (rig) {
                    rig.setTransform('head', { rotation: 10, x: 7, y: 2 });
                    rig.setTransform('leftEye', { x: 5, y: 3 });
                    rig.setTransform('rightEye', { x: 5, y: 3 });
                    rig.setTransform('mouth', { scaleX: 1.1, scaleY: 1.05, y: -1 });
                }
            }, 3800);

            // =========================================================================
            // STEP 5: PNg INTERACTS WITH / GENTLY TOUCHES BIRD (5.0s - 7.6s)
            // =========================================================================
            this.addTimer(() => {
                if (!this.isActive || !this.activeBirdElement) return;

                console.log('[PNgAmbientController] ❤️ Step 5: PNg gently petting & interacting with bird!');
                charWrap.classList.add('png-interact-bird');

                // Bird reacts with a cute ruffle / chirp flutter on the hand
                this.activeBirdElement.classList.add('bird-chirp-react');

                if (rig) {
                    // Gentle finger wiggle / hand micro-movement
                    rig.setTransform('rightArm', { rotation: -32, x: 14, y: -24 });
                    rig.setTransform('mouth', { scaleX: 1.2, scaleY: 1.2, y: 0 }); // Happy smile
                }
            }, 5000);

            // Bird settles happily after greeting (6.4s)
            this.addTimer(() => {
                if (this.activeBirdElement) {
                    this.activeBirdElement.classList.remove('bird-chirp-react');
                }
            }, 6400);

            // =========================================================================
            // STEP 6: BIRD TAKEOFF & FLIES AWAY (7.6s - 9.4s)
            // =========================================================================
            this.addTimer(() => {
                if (!this.isActive || !this.activeBirdElement) return;

                console.log('[PNgAmbientController] 🚀 Step 6: Bird taking off from hand and flying away...');
                this.activeBirdElement.classList.remove('bird-perched-on-hand');
                this.activeBirdElement.classList.add('flight-takeoff-departure');

                // PNg watches bird fly away: head tilts slightly up-right following departure
                charWrap.classList.remove('png-interact-bird', 'png-notice-bird');
                charWrap.classList.add('png-watch-departure');

                if (rig) {
                    rig.setTransform('head', { rotation: 12, x: 5, y: -4 });
                    rig.setTransform('leftEye', { x: 4, y: -3 });
                    rig.setTransform('rightEye', { x: 4, y: -3 });
                }
            }, 7600);

            // Smooth arm lowering and return to idle (8.6s)
            this.addTimer(() => {
                if (!this.isActive) return;

                charWrap.classList.remove('png-perch-ready', 'png-watch-departure');
                charWrap.classList.add('png-idle-restore');

                if (rig) {
                    rig.resetPart('rightArm');
                    rig.resetPart('head');
                    rig.resetPart('face');
                    rig.resetPart('leftEye');
                    rig.resetPart('rightEye');
                    rig.resetPart('mouth');
                }

                // Clean restore class after transition
                this.addTimer(() => {
                    charWrap.classList.remove('png-idle-restore');
                }, 800);
            }, 8600);

            // Bird completely leaves the scene and is removed from DOM (9.4s)
            this.addTimer(() => {
                this.removeBird();

                // =====================================================================
                // STEP 7: WAIT EXACTLY 5 SECONDS (5000ms)
                // =====================================================================
                console.log('[PNgAmbientController] ⏱️ Step 7: Bird departed. Waiting exactly 5 seconds before next interaction...');
                this.scheduleNextCycle(this.postDepartureWaitMs);
            }, 9400);
        }

        removeBird() {
            if (this.activeBirdElement) {
                if (this.activeBirdElement.parentNode) {
                    this.activeBirdElement.parentNode.removeChild(this.activeBirdElement);
                }
                this.activeBirdElement = null;
            }
        }

        destroy() {
            this.stop();
        }
    }

    global.PNgAmbientController = PNgAmbientController;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PNgAmbientController;
    }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
