/**
 * Travel AI Buddy — Step 2: Central Buddy Animation & Rig Engine
 * 
 * Coordinates smooth kinematics, part-by-part articulation, priority scheduling,
 * easing curves, transform composition, and zero-drift neutral resets on AI/png.svg.
 * 
 * Core API:
 * - animate(partKey, targetProperties, options)
 * - parallel(partAnimations, options)
 * - sequence(steps, options)
 * - createTimeline(options)
 * - playAction({ name, priority, options })
 * - captureNeutralPose()
 * - resetPart(partKey, options)
 * - resetAll(options)
 * - cancelCurrent()
 * - cancelPart(partKey)
 * - lockParts(parts, ownerId, priority)
 * - unlockParts(parts, ownerId)
 */
(function (global) {
    const _StateModule = (typeof global.BuddyAnimationState !== 'undefined')
        ? global.BuddyAnimationState
        : (typeof require !== 'undefined' ? require('./BuddyAnimationState') : {});

    const _TimelineClass = (typeof global.BuddyTimeline !== 'undefined')
        ? global.BuddyTimeline
        : (typeof require !== 'undefined' ? require('./BuddyTimeline') : null);

    const AnimationPriority = _StateModule.AnimationPriority || { IDLE: 1, NORMAL: 2, IMPORTANT: 3, CRITICAL: 4 };
    const resolveEasing = _StateModule.resolveEasing || ((t) => t * (2 - t));
    const interpolateTransform = _StateModule.interpolateTransform;
    const BuddyPartLockManager = _StateModule.BuddyPartLockManager || class {
        acquire() { return true; }
        release() {}
        isLocked() { return false; }
        getLockedParts() { return []; }
        clear() {}
    };

    const _raf = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame
        : ((cb) => setTimeout(() => cb((typeof performance !== 'undefined' ? performance.now() : Date.now())), 16));

    const _caf = (typeof cancelAnimationFrame !== 'undefined')
        ? cancelAnimationFrame
        : ((id) => clearTimeout(id));

    class BuddyAnimationEngine {
        constructor(rigController = null) {
            this.rig = rigController;
            this.lockManager = new BuddyPartLockManager();

            // Neutral Pose baseline store: partKey -> { rotation, x, y, scaleX, scaleY, opacity }
            this.neutralPose = new Map();

            // Active Tweens: tweenId -> TweenObject
            this.activeTweens = new Map();
            // Active Part -> TweenId
            this.partTweenMap = new Map();

            // Active Animation Queue & Tracking
            this.animationQueue = [];
            this.currentActionName = 'IDLE';
            this.currentPriority = AnimationPriority.IDLE;

            // Single Central Ticker (Zero idle CPU overhead)
            this._tickerId = null;
            this._isTicking = false;

            // Listeners for debug / UI telemetry
            this.listeners = new Set();

            if (this.rig) {
                this.attachRig(this.rig);
            }
        }

        /**
         * Attach or update the underlying rig controller
         */
        attachRig(rigController) {
            this.rig = rigController;
            this.captureNeutralPose();
        }

        /**
         * Capture and lock the neutral resting pose for every controllable part
         */
        captureNeutralPose() {
            this.neutralPose.clear();
            if (!this.rig || !this.rig.config || !this.rig.config.parts) return;

            for (const [key, partDef] of Object.entries(this.rig.config.parts)) {
                const defState = partDef.defaultState || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
                this.neutralPose.set(key, { ...defState });
            }
        }

        /**
         * Get the recorded neutral pose for a part
         */
        getNeutralPose(partKey) {
            const canonical = this.rig ? this.rig.resolvePartKey(partKey) : partKey;
            return this.neutralPose.get(canonical) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
        }

        /**
         * Animate a single rig body part to target transform properties
         * @param {string} partKey e.g. 'head', 'leftUpperArm', 'leftForearm', 'rightHand', 'leftEye'
         * @param {object} targetProperties { rotation, translateX/x, translateY/y, scaleX, scaleY, opacity }
         * @param {object} [options] { duration, easing, delay, priority, owner, onComplete }
         * @returns {Promise} Resolves when animation completes or safely interrupts
         */
        animate(partKey, targetProperties, options = {}) {
            return new Promise((resolve, reject) => {
                if (!this.rig) {
                    console.warn(`[BuddyAnimationEngine] No rig controller attached for '${partKey}'`);
                    resolve();
                    return;
                }

                const canonicalKey = this.rig.resolvePartKey(partKey);
                if (!canonicalKey || !this.rig.getPart(canonicalKey)) {
                    console.warn(`Buddy rig part not found: ${partKey}`);
                    resolve();
                    return;
                }

                const duration = options.duration !== undefined ? options.duration : 350;
                const delay = options.delay || 0;
                const easing = resolveEasing(options.easing || 'easeOut');
                const priority = options.priority || AnimationPriority.NORMAL;
                const owner = options.owner || `anim_${Date.now()}`;

                // Check Part Lock & Priority
                if (!this.lockManager.acquire(canonicalKey, owner, priority)) {
                    // Lower priority cannot interrupt locked higher priority
                    resolve();
                    return;
                }

                // If delayed, schedule execution
                if (delay > 0) {
                    setTimeout(() => {
                        this._startTween(canonicalKey, targetProperties, duration, easing, priority, owner, resolve, reject, options.onComplete);
                    }, delay);
                } else {
                    this._startTween(canonicalKey, targetProperties, duration, easing, priority, owner, resolve, reject, options.onComplete);
                }
            });
        }

        _startTween(canonicalKey, targetProperties, duration, easing, priority, owner, resolve, reject, onComplete) {
            // Cancel any existing running tween on this specific body part
            if (this.partTweenMap.has(canonicalKey)) {
                const prevTweenId = this.partTweenMap.get(canonicalKey);
                const prevTween = this.activeTweens.get(prevTweenId);
                if (prevTween) {
                    prevTween.cancelled = true;
                    if (prevTween.resolve) prevTween.resolve();
                    this.activeTweens.delete(prevTweenId);
                }
            }

            // Capture current starting transform (maintains transform composition)
            const startState = { ...(this.rig.getPartState(canonicalKey) || this.getNeutralPose(canonicalKey)) };
            const startTime = performance.now();
            const tweenId = `tw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            const tween = {
                id: tweenId,
                part: canonicalKey,
                startState,
                targetProperties,
                startTime,
                duration: Math.max(1, duration),
                easing,
                priority,
                owner,
                cancelled: false,
                resolve,
                reject,
                onComplete
            };

            this.activeTweens.set(tweenId, tween);
            this.partTweenMap.set(canonicalKey, tweenId);

            this._ensureTicker();
            this.notify();
        }

        /**
         * Animate multiple parts simultaneously in parallel
         * @param {Array<{ part: string, properties: object, duration?: number, easing?: string|Function, delay?: number }>} partAnimations
         * @param {object} [options] Global options override
         * @returns {Promise} Resolves when all parallel animations finish
         */
        parallel(partAnimations, options = {}) {
            if (!Array.isArray(partAnimations) || partAnimations.length === 0) {
                return Promise.resolve();
            }

            const promises = partAnimations.map(anim => {
                return this.animate(anim.part, anim.properties, {
                    duration: anim.duration !== undefined ? anim.duration : options.duration,
                    easing: anim.easing || options.easing,
                    delay: anim.delay !== undefined ? anim.delay : options.delay,
                    priority: anim.priority || options.priority,
                    owner: anim.owner || options.owner
                });
            });

            return Promise.all(promises);
        }

        /**
         * Animate a sequence of steps one after another
         * @param {Array<object|Array>} steps List of sequential animation steps
         * @param {object} [options]
         * @returns {Promise} Resolves when all steps complete
         */
        async sequence(steps, options = {}) {
            if (!Array.isArray(steps) || steps.length === 0) {
                return;
            }

            for (const step of steps) {
                if (Array.isArray(step)) {
                    await this.parallel(step, options);
                } else if (step && step.part) {
                    await this.animate(step.part, step.properties, {
                        duration: step.duration !== undefined ? step.duration : options.duration,
                        easing: step.easing || options.easing,
                        delay: step.delay !== undefined ? step.delay : options.delay,
                        priority: step.priority || options.priority,
                        owner: step.owner || options.owner
                    });
                }
            }
        }

        /**
         * Create a multi-track action timeline
         */
        createTimeline(options = {}) {
            if (_TimelineClass) {
                return new _TimelineClass(this, options);
            }
            throw new Error('BuddyTimeline module not available');
        }

        /**
         * Action-ready API skeleton for compound gestures (e.g. point, wave, think)
         */
        async playAction({ name, priority = 'normal', options = {} }) {
            this.currentActionName = name.toUpperCase();
            this.currentPriority = AnimationPriority[priority.toUpperCase()] || AnimationPriority.NORMAL;
            this.notify();

            // Infrastructure placeholder for Step 3 Action Choreography
            return Promise.resolve();
        }

        /**
         * Reset a single body part back to exact neutral resting pose
         * @param {string} partKey
         * @param {object} [options] { animated: boolean, duration: number, easing: string }
         */
        resetPart(partKey, options = {}) {
            const canonical = this.rig ? this.rig.resolvePartKey(partKey) : partKey;
            const neutral = this.getNeutralPose(canonical);

            if (options.animated) {
                return this.animate(canonical, neutral, {
                    duration: options.duration || 300,
                    easing: options.easing || 'easeOutQuad',
                    priority: AnimationPriority.CRITICAL,
                    owner: 'system_reset'
                });
            }

            this.cancelPart(canonical);
            this.lockManager.release(canonical);
            if (this.rig) {
                this.rig.setTransform(canonical, { ...neutral });
            }
            this.notify();
            return Promise.resolve();
        }

        /**
         * Reset all body parts back to the exact neutral baseline (0% transform drift)
         * @param {object} [options] { animated: boolean, duration: number, easing: string }
         */
        resetAll(options = {}) {
            this.cancelCurrent();
            this.lockManager.clear();
            this.currentActionName = 'IDLE (RESET)';
            this.currentPriority = AnimationPriority.IDLE;

            if (options.animated && this.rig && this.rig.config && this.rig.config.parts) {
                const anims = [];
                for (const key of Object.keys(this.rig.config.parts)) {
                    anims.push({
                        part: key,
                        properties: this.getNeutralPose(key),
                        duration: options.duration || 350,
                        easing: options.easing || 'easeOutQuad'
                    });
                }
                return this.parallel(anims, { priority: AnimationPriority.CRITICAL, owner: 'system_reset' })
                    .then(() => {
                        this.currentActionName = 'IDLE';
                        this.notify();
                    });
            }

            if (this.rig) {
                this.rig.resetAll();
            }
            this.notify();
            return Promise.resolve();
        }

        /**
         * Safely cancel all currently running tweens without breaking transforms
         */
        cancelCurrent() {
            for (const [id, tween] of this.activeTweens.entries()) {
                tween.cancelled = true;
                if (tween.resolve) tween.resolve();
            }
            this.activeTweens.clear();
            this.partTweenMap.clear();
            this._stopTicker();
            this.notify();
        }

        /**
         * Cancel tween for a specific part
         */
        cancelPart(partKey) {
            const canonical = this.rig ? this.rig.resolvePartKey(partKey) : partKey;
            if (this.partTweenMap.has(canonical)) {
                const tweenId = this.partTweenMap.get(canonical);
                const tween = this.activeTweens.get(tweenId);
                if (tween) {
                    tween.cancelled = true;
                    if (tween.resolve) tween.resolve();
                    this.activeTweens.delete(tweenId);
                }
                this.partTweenMap.delete(canonical);
            }
            if (this.activeTweens.size === 0) {
                this._stopTicker();
            }
            this.notify();
        }

        /**
         * Lock one or more parts for exclusive ownership
         */
        lockParts(parts, ownerId, priority = AnimationPriority.NORMAL) {
            return this.lockManager.acquire(parts, ownerId, priority);
        }

        /**
         * Unlock one or more parts
         */
        unlockParts(parts, ownerId = null) {
            this.lockManager.release(parts, ownerId);
            this.notify();
        }

        /**
         * Central unified requestAnimationFrame ticker
         */
        _ensureTicker() {
            if (this._isTicking) return;
            this._isTicking = true;
            this._tickerId = _raf(() => this._tick());
        }

        _stopTicker() {
            this._isTicking = false;
            if (this._tickerId) {
                _caf(this._tickerId);
                this._tickerId = null;
            }
        }

        _tick() {
            if (!this._isTicking) return;

            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const completedTweenIds = [];

            for (const [id, tween] of this.activeTweens.entries()) {
                if (tween.cancelled) {
                    completedTweenIds.push(id);
                    continue;
                }

                const elapsed = now - tween.startTime;
                const rawProgress = Math.min(1, elapsed / tween.duration);
                const easedProgress = tween.easing(rawProgress);

                // Compute interpolated state with composition
                const currentState = interpolateTransform(tween.startState, tween.targetProperties, easedProgress);

                if (this.rig) {
                    this.rig.setTransform(tween.part, currentState);
                }

                if (rawProgress >= 1) {
                    // Reached 100% target
                    completedTweenIds.push(id);
                    if (tween.onComplete) {
                        try { tween.onComplete(); } catch (e) {}
                    }
                    if (tween.resolve) {
                        tween.resolve();
                    }
                }
            }

            // Cleanup completed tweens
            for (const id of completedTweenIds) {
                const tween = this.activeTweens.get(id);
                if (tween) {
                    this.partTweenMap.delete(tween.part);
                    this.lockManager.release(tween.part, tween.owner);
                }
                this.activeTweens.delete(id);
            }

            if (this.activeTweens.size > 0) {
                this._tickerId = _raf(() => this._tick());
            } else {
                this._stopTicker();
            }

            this.notify();
        }

        // Telemetry & Debug Information
        getActiveParts() {
            return Array.from(this.partTweenMap.keys());
        }

        getLockedParts() {
            return this.lockManager.getLockedParts();
        }

        getRunningAnimations() {
            return Array.from(this.activeTweens.values());
        }

        getQueueLength() {
            return this.animationQueue.length;
        }

        onChange(callback) {
            this.listeners.add(callback);
            return () => this.listeners.delete(callback);
        }

        notify() {
            for (const listener of this.listeners) {
                try { listener(this); } catch (e) {}
            }
        }
    }

    global.BuddyAnimationEngine = BuddyAnimationEngine;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyAnimationEngine;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
