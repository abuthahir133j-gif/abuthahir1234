/**
 * Travel AI Buddy — Step 4: Look / Gaze Controller
 * 
 * Reusable Look/Gaze orchestration system for AI/png.svg character rig.
 * 
 * Key Features:
 * - Target Resolver Integration: Resolves DOM Elements, Coordinates {x, y}, and Pointer
 * - Staggered Kinematic Sequences: Eyes react first (0ms), Head follows (100ms)
 * - Safe Clamping: Natural eye & neck rotation limits via GazePoseCalculator
 * - Part Ownership & Priority Scheduling: Integrates with Step 2 Animation Engine
 * - Zero Drift Neutral Return: clearGaze() smoothly resets to exact baseline
 * - Live Dynamic Tracking: Seamlessly tracks moving elements & pointer positions
 * - Dev-Only Visual Debug Marker
 */
(function (global) {
    const _TargetResolver = (typeof global.TargetResolver !== 'undefined')
        ? global.TargetResolver
        : (typeof require !== 'undefined' ? require('./TargetResolver') : null);

    const _GazePoseCalculator = (typeof global.GazePoseCalculator !== 'undefined')
        ? global.GazePoseCalculator
        : (typeof require !== 'undefined' ? require('./GazePoseCalculator') : null);

    const _StateModule = (typeof global.BuddyAnimationState !== 'undefined')
        ? global.BuddyAnimationState
        : (typeof require !== 'undefined' ? require('../../../components/TravelBuddy/BuddyAnimationState') : {});

    const AnimationPriority = _StateModule.AnimationPriority || { IDLE: 1, NORMAL: 2, IMPORTANT: 3, CRITICAL: 4 };

    class GazeController {
        constructor(animationEngine, options = {}) {
            this.engine = animationEngine;
            this.debug = options.debug || false;
            this.isActive = false;
            this.currentActionId = null;
            this.currentTarget = null;
            this.currentTargetData = null;
            this.currentPoseData = null;
            this.lockedParts = [];
            this.isTracking = false;
            this._trackingRafId = null;
            this.debugMarker = null;

            // Telemetry State
            this.state = {
                currentGaze: 'NONE', // 'NONE' | 'LOOKING' | 'TRACKING'
                targetName: 'NONE',
                targetX: 0,
                targetY: 0,
                eyeX: 0,
                eyeY: 0,
                headRotation: 0,
                headY: 0,
                bodyLean: 0,
                priority: AnimationPriority.NORMAL
            };

            this.listeners = new Set();
        }

        /**
         * Look toward a target (DOM element, screen position, or pointer)
         * @param {string|HTMLElement|object} target
         * @param {object} [options]
         * @param {number} [options.priority=2] Animation priority
         * @param {number} [options.holdDuration=0] Hold gaze indefinitely (0) or auto-return (ms)
         * @param {boolean} [options.track=false] Continuously track moving target / pointer
         * @param {boolean} [options.showMarker=false] Show dev debug marker
         * @param {number} [options.speed=1] Speed multiplier
         * @returns {Promise<object>} Result status object
         */
        async lookAt(target, options = {}) {
            if (!this.engine) {
                console.warn('[GazeController] No BuddyAnimationEngine attached.');
                return { success: false, reason: 'NO_ANIMATION_ENGINE' };
            }

            const priority = options.priority || AnimationPriority.NORMAL;
            const holdDuration = options.holdDuration !== undefined ? options.holdDuration : 0;
            const track = options.track || (typeof target === 'object' && target?.type === 'pointer');
            const showMarker = options.showMarker !== undefined ? options.showMarker : this.debug;
            const speed = Math.max(0.1, Number(options.speed) || 1);

            // 1. Resolve Target
            const buddyDom = (typeof document !== 'undefined') ? document.getElementById('travel-buddy-root') : null;
            const targetData = _TargetResolver ? _TargetResolver.resolve(target, buddyDom) : { success: false, reason: 'NO_RESOLVER' };

            if (!targetData.success) {
                console.warn('[GazeController] Target resolution failed:', targetData.reason, target);
                return { success: false, reason: targetData.reason, target };
            }

            // 2. Calculate Gaze Pose & Limits
            const poseData = _GazePoseCalculator ? _GazePoseCalculator.calculateGaze(targetData, options.limits) : null;
            if (!poseData) {
                return { success: false, reason: 'POSE_CALCULATION_FAILED' };
            }

            // Stop any ongoing tracking loop before starting new animation
            this.stopTracking();

            this.isActive = true;
            this.currentTarget = target;
            this.currentTargetData = targetData;
            this.currentPoseData = poseData;

            const actionId = `gaze_${Date.now()}`;
            this.currentActionId = actionId;

            // 3. Acquire Part Locks (Eyes, Head, Body - strictly NO arms)
            const gazeParts = ['leftEye', 'rightEye', 'head', 'body'];
            this.lockedParts = gazeParts;
            this.engine.lockParts(gazeParts, actionId, priority);

            // Update telemetry
            this.state = {
                currentGaze: track ? 'TRACKING' : 'LOOKING',
                targetName: targetData.targetId || 'TARGET',
                targetX: targetData.targetX,
                targetY: targetData.targetY,
                eyeX: poseData.metrics.eyeX,
                eyeY: poseData.metrics.eyeY,
                headRotation: poseData.metrics.headRotation,
                headY: poseData.metrics.headY,
                bodyLean: poseData.metrics.bodyLean,
                priority
            };
            this._notifyState();

            // 4. Render Dev Debug Marker if requested
            if (showMarker && typeof document !== 'undefined') {
                this._renderDebugMarker(targetData.targetX, targetData.targetY, targetData.buddyX, targetData.buddyY);
            }

            try {
                // SEQUENCE: EYES FIRST (0ms) -> HEAD FOLLOWS (100ms) -> OPTIONAL SUBTLE BODY
                const eyesDuration = Math.round(poseData.timing.eyesDuration / speed);
                const headDelay = Math.round(poseData.timing.headDelay / speed);
                const headDuration = Math.round(poseData.timing.headDuration / speed);
                const bodyDuration = Math.round(poseData.timing.bodyDuration / speed);

                await Promise.all([
                    // 1. Eyes start moving immediately
                    this.engine.parallel([
                        { part: 'leftEye', properties: poseData.pose.leftEye, duration: eyesDuration, easing: 'easeOut' },
                        { part: 'rightEye', properties: poseData.pose.rightEye, duration: eyesDuration, easing: 'easeOut' }
                    ], { priority, owner: actionId }),

                    // 2. Head subtly follows with small delay (80-150ms)
                    this.engine.animate('head', poseData.pose.head, {
                        duration: headDuration,
                        delay: headDelay,
                        easing: 'easeOut',
                        priority,
                        owner: actionId
                    }),

                    // 3. Optional subtle torso reaction
                    this.engine.animate('body', poseData.pose.body, {
                        duration: bodyDuration,
                        delay: headDelay,
                        easing: 'easeOut',
                        priority,
                        owner: actionId
                    })
                ]);

                if (!this.isActive || this.currentActionId !== actionId) {
                    return { success: false, reason: 'INTERRUPTED' };
                }

                // If continuous tracking is requested, start live tracker loop
                if (track) {
                    this.startTracking(target, { priority, showMarker, speed });
                }

                // If holdDuration is specified (> 0), hold then return to neutral
                if (holdDuration > 0 && !track) {
                    await new Promise(r => setTimeout(r, holdDuration));
                    if (this.isActive && this.currentActionId === actionId) {
                        await this.clearGaze({ animated: true, duration: Math.round(350 / speed) });
                    }
                }

                return {
                    success: true,
                    targetData,
                    poseData
                };
            } catch (err) {
                console.error('[GazeController] Error during gaze execution:', err);
                this.cancel();
                return { success: false, error: err.message };
            }
        }

        /**
         * Update current gaze smoothly to a new target without full restart
         */
        async updateTarget(target, options = {}) {
            return this.lookAt(target, {
                ...options,
                speed: options.speed || 1.4 // slightly snappier for dynamic updates
            });
        }

        /**
         * Smoothly return eyes and head to neutral resting pose
         * Uses exact neutral baseline from the rig engine (never hardcodes zero values).
         */
        async clearGaze(options = {}) {
            this.stopTracking();
            this._removeDebugMarker();

            const animated = options.animated !== undefined ? options.animated : true;
            const duration = options.duration || 320;
            const speed = Math.max(0.1, Number(options.speed) || 1);

            this.isActive = false;
            this.currentActionId = null;
            this.currentTarget = null;

            if (this.engine) {
                if (animated) {
                    const gazeParts = ['leftEye', 'rightEye', 'head', 'body'];
                    const neutralAnims = gazeParts.map(partKey => ({
                        part: partKey,
                        properties: this.engine.getNeutralPose(partKey),
                        duration: Math.round(duration / speed),
                        easing: 'easeInOut'
                    }));

                    await this.engine.parallel(neutralAnims, {
                        priority: AnimationPriority.CRITICAL,
                        owner: 'gaze_clear'
                    });
                } else {
                    for (const part of ['leftEye', 'rightEye', 'head', 'body']) {
                        this.engine.resetPart(part, { animated: false });
                    }
                }

                if (this.lockedParts.length > 0) {
                    this.engine.unlockParts(this.lockedParts);
                    this.lockedParts = [];
                }
            }

            this.state = {
                currentGaze: 'NONE',
                targetName: 'NONE',
                targetX: 0,
                targetY: 0,
                eyeX: 0,
                eyeY: 0,
                headRotation: 0,
                headY: 0,
                bodyLean: 0,
                priority: AnimationPriority.IDLE
            };
            this._notifyState();

            return { success: true };
        }

        /**
         * Start continuous live tracking of moving element or pointer
         */
        startTracking(target, options = {}) {
            if (this.isTracking) return;
            this.isTracking = true;
            this.state.currentGaze = 'TRACKING';
            this._notifyState();

            let lastX = null;
            let lastY = null;

            const trackLoop = () => {
                if (!this.isTracking || !this.isActive) return;

                const buddyDom = (typeof document !== 'undefined') ? document.getElementById('travel-buddy-root') : null;
                const targetData = _TargetResolver ? _TargetResolver.resolve(target, buddyDom) : null;

                if (targetData && targetData.success) {
                    const distMoved = (lastX === null) ? 999 : Math.hypot(targetData.targetX - lastX, targetData.targetY - lastY);
                    
                    // Only update if target has moved more than 3px (prevents redundant calculation)
                    if (distMoved > 3) {
                        lastX = targetData.targetX;
                        lastY = targetData.targetY;

                        const poseData = _GazePoseCalculator ? _GazePoseCalculator.calculateGaze(targetData, options.limits) : null;
                        if (poseData && this.engine) {
                            const actionId = this.currentActionId || 'gaze_track';
                            const priority = options.priority || AnimationPriority.NORMAL;

                            // Fast smooth interpolation during continuous tracking
                            this.engine.animate('leftEye', poseData.pose.leftEye, { duration: 120, easing: 'linear', priority, owner: actionId });
                            this.engine.animate('rightEye', poseData.pose.rightEye, { duration: 120, easing: 'linear', priority, owner: actionId });
                            this.engine.animate('head', poseData.pose.head, { duration: 160, easing: 'linear', priority, owner: actionId });
                            this.engine.animate('body', poseData.pose.body, { duration: 180, easing: 'linear', priority, owner: actionId });

                            this.state.targetX = targetData.targetX;
                            this.state.targetY = targetData.targetY;
                            this.state.eyeX = poseData.metrics.eyeX;
                            this.state.eyeY = poseData.metrics.eyeY;
                            this.state.headRotation = poseData.metrics.headRotation;
                            this.state.headY = poseData.metrics.headY;
                            this.state.bodyLean = poseData.metrics.bodyLean;
                            this._notifyState();

                            if (options.showMarker) {
                                this._renderDebugMarker(targetData.targetX, targetData.targetY, targetData.buddyX, targetData.buddyY);
                            }
                        }
                    }
                }

                if (typeof requestAnimationFrame !== 'undefined') {
                    this._trackingRafId = requestAnimationFrame(trackLoop);
                }
            };

            if (typeof requestAnimationFrame !== 'undefined') {
                this._trackingRafId = requestAnimationFrame(trackLoop);
            }
        }

        /**
         * Stop continuous tracking loop
         */
        stopTracking() {
            this.isTracking = false;
            if (this._trackingRafId && typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this._trackingRafId);
                this._trackingRafId = null;
            }
        }

        /**
         * Safely cancel / interrupt active gaze
         */
        cancel() {
            this.stopTracking();
            this.isActive = false;
            this.currentActionId = null;

            if (this.engine) {
                this.engine.cancelPart('leftEye');
                this.engine.cancelPart('rightEye');
                this.engine.cancelPart('head');
                this.engine.cancelPart('body');
                if (this.lockedParts.length > 0) {
                    this.engine.unlockParts(this.lockedParts);
                    this.lockedParts = [];
                }
            }
            this._removeDebugMarker();
            this.state.currentGaze = 'NONE';
            this._notifyState();
        }

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
            for (const listener of this.listeners) {
                try { listener(st); } catch (e) {}
            }
        }

        _renderDebugMarker(tx, ty, bx, by) {
            if (typeof document === 'undefined') return;
            this._removeDebugMarker();

            const marker = document.createElement('div');
            marker.id = 'buddy-gaze-debug-marker';
            marker.style.position = 'fixed';
            marker.style.left = `${tx - 10}px`;
            marker.style.top = `${ty - 10}px`;
            marker.style.width = '20px';
            marker.style.height = '20px';
            marker.style.borderRadius = '50%';
            marker.style.border = '2px solid #A855F7';
            marker.style.background = 'rgba(168, 85, 247, 0.4)';
            marker.style.boxShadow = '0 0 14px rgba(168, 85, 247, 0.9)';
            marker.style.pointerEvents = 'none';
            marker.style.zIndex = '999999';
            marker.innerHTML = '<div style="width: 4px; height: 4px; background: #FFF; border-radius: 50%; margin: 6px auto;"></div>';
            document.body.appendChild(marker);
            this.debugMarker = marker;
        }

        _removeDebugMarker() {
            if (this.debugMarker && this.debugMarker.parentNode) {
                this.debugMarker.parentNode.removeChild(this.debugMarker);
                this.debugMarker = null;
            }
        }
    }

    global.GazeController = GazeController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GazeController;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
