/**
 * Travel AI Buddy — Step 3: Natural Point Action Orchestrator
 * 
 * Orchestrates natural pointing toward any target (DOM Element, UI Card, Coordinates)
 * using the locked AI/png.svg character rig and BuddyAnimationEngine.
 * 
 * Staggered Phases:
 * 1. ATTENTION (Eyes move toward target)
 * 2. HEAD (Head turns toward target)
 * 3. BODY (Subtle torso lean & weight shift)
 * 4. ARM (Upper arm elevates around shoulder pivot)
 * 5. FOREARM & HAND (Forearm flexes around elbow + Hand aligns)
 * 6. FOLLOW-THROUGH & SETTLE (Micro-oscillation settle)
 * 7. HOLD (Maintains pointing pose for configurable duration)
 * 8. RETURN TO NEUTRAL (Smooth return to baseline neutral resting pose)
 */
(function (global) {
    const _TargetResolver = (typeof global.TargetResolver !== 'undefined')
        ? global.TargetResolver
        : (typeof require !== 'undefined' ? require('./TargetResolver') : null);

    const _PoseCalculator = (typeof global.PointPoseCalculator !== 'undefined')
        ? global.PointPoseCalculator
        : (typeof require !== 'undefined' ? require('./PointPoseCalculator') : null);

    const _StateModule = (typeof global.BuddyAnimationState !== 'undefined')
        ? global.BuddyAnimationState
        : (typeof require !== 'undefined' ? require('../../../components/TravelBuddy/BuddyAnimationState') : {});

    const AnimationPriority = _StateModule.AnimationPriority || { IDLE: 1, NORMAL: 2, IMPORTANT: 3, CRITICAL: 4 };

    class PointAction {
        constructor(animationEngine, options = {}) {
            this.engine = animationEngine;
            this.debug = options.debug || false;
            this.isActive = false;
            this.currentActionId = null;
            this.lockedParts = [];
            this.debugMarker = null;

            this.listeners = new Set();
        }

        /**
         * Execute natural pointing action toward target
         * @param {object} params
         * @param {string|HTMLElement|object} params.target Element ID, DOM element, or { x, y }
         * @param {number} [params.holdDuration=1200] Time to hold pointing pose (ms)
         * @param {number} [params.priority=3] Animation priority
         * @param {boolean} [params.showMarker=false] Show visual debug target marker
         * @returns {Promise<object>} Result status object
         */
        async execute(params = {}) {
            const target = params.target || params;
            const holdDuration = params.holdDuration !== undefined ? params.holdDuration : 1200;
            const priority = params.priority || AnimationPriority.IMPORTANT;
            const showMarker = params.showMarker !== undefined ? params.showMarker : this.debug;

            if (!this.engine) {
                console.warn('[PointAction] No BuddyAnimationEngine attached.');
                return { success: false, reason: 'NO_ANIMATION_ENGINE' };
            }

            // 1. Resolve Target Coordinates
            const buddyDom = (typeof document !== 'undefined') ? document.getElementById('travel-buddy-root') : null;
            const targetData = _TargetResolver ? _TargetResolver.resolve(target, buddyDom) : { success: false, reason: 'NO_RESOLVER' };

            if (!targetData.success) {
                console.warn(`[PointAction] Target resolution failed:`, targetData.reason, target);
                return {
                    success: false,
                    reason: targetData.reason,
                    target
                };
            }

            // 2. Compute Kinematics & IK Joint Angles
            const poseData = _PoseCalculator ? _PoseCalculator.calculatePose(targetData) : null;
            if (!poseData) {
                return { success: false, reason: 'POSE_CALCULATION_FAILED' };
            }

            // 3. Cancel any prior active point action
            if (this.isActive) {
                this.cancel();
            }

            this.isActive = true;
            const actionId = `point_${Date.now()}`;
            this.currentActionId = actionId;

            // 4. Acquire Part Locks & Ownership
            const pointingParts = [
                'leftEye', 'rightEye', 'head', 'body',
                poseData.parts.upperArmKey,
                poseData.parts.forearmKey,
                poseData.parts.handKey
            ];
            this.lockedParts = pointingParts;
            this.engine.lockParts(pointingParts, actionId, priority);

            // 5. Render Temporary Debug Target Marker (if in debug mode)
            if (showMarker && typeof document !== 'undefined') {
                this._renderDebugMarker(targetData.targetX, targetData.targetY);
            }

            this._notifyProgress('STARTING', { targetData, poseData });

            const speed = Math.max(0.1, Number(params.speed) || 1);

            try {
                // PHASE 1 — ATTENTION & ANTICIPATION (0ms - 100ms)
                this._notifyProgress('ATTENTION', { targetData, poseData });
                await Promise.all([
                    // Eyes start looking immediately
                    this.engine.parallel([
                        { part: 'leftEye', properties: poseData.pose.eyes, duration: Math.round(220 / speed), easing: 'easeOut' },
                        { part: 'rightEye', properties: poseData.pose.eyes, duration: Math.round(220 / speed), easing: 'easeOut' }
                    ], { priority, owner: actionId }),
                    // Subtle body/head anticipation
                    this.engine.animate('body', poseData.anticipation.body, { duration: Math.round(120 / speed), easing: 'easeInOut', priority, owner: actionId })
                ]);

                if (!this.isActive || this.currentActionId !== actionId) return { success: false, reason: 'INTERRUPTED' };

                // PHASE 2 — HEAD & BODY LEAN (100ms - 280ms)
                this._notifyProgress('HEAD_AND_BODY', { targetData, poseData });
                await Promise.all([
                    this.engine.animate('head', poseData.pose.head, { duration: Math.round(280 / speed), easing: 'easeOut', priority, owner: actionId }),
                    this.engine.animate('body', poseData.pose.body, { duration: Math.round(320 / speed), easing: 'easeOut', priority, owner: actionId })
                ]);

                if (!this.isActive || this.currentActionId !== actionId) return { success: false, reason: 'INTERRUPTED' };

                // PHASE 3 — ARM ELEVATION & FOREARM EXTENSION (280ms - 520ms)
                this._notifyProgress('ARM_EXTENSION', { targetData, poseData });
                const upperArmKey = poseData.parts.upperArmKey;
                const forearmKey = poseData.parts.forearmKey;
                const handKey = poseData.parts.handKey;

                await Promise.all([
                    this.engine.animate(upperArmKey, poseData.pose[upperArmKey], { duration: Math.round(320 / speed), easing: 'easeOutBack', priority, owner: actionId }),
                    this.engine.animate(forearmKey, poseData.pose[forearmKey], { duration: Math.round(260 / speed), easing: 'easeOut', delay: Math.round(60 / speed), priority, owner: actionId }),
                    this.engine.animate(handKey, poseData.pose[handKey], { duration: Math.round(220 / speed), easing: 'easeOut', delay: Math.round(100 / speed), priority, owner: actionId })
                ]);

                if (!this.isActive || this.currentActionId !== actionId) return { success: false, reason: 'INTERRUPTED' };

                // PHASE 4 — FOLLOW-THROUGH & SETTLE
                this._notifyProgress('SETTLE', { targetData, poseData });
                await this.engine.animate(handKey, poseData.pose[handKey], { duration: Math.round(150 / speed), easing: 'easeInOut', priority, owner: actionId });

                // PHASE 5 — HOLD (1000ms - 2000ms)
                this._notifyProgress('HOLDING', { targetData, poseData });
                await new Promise(r => setTimeout(r, holdDuration));

                if (!this.isActive || this.currentActionId !== actionId) return { success: false, reason: 'INTERRUPTED' };

                // PHASE 6 — RETURN TO NEUTRAL
                this._notifyProgress('RETURNING', { targetData, poseData });
                await this.engine.resetAll({ animated: true, duration: Math.round(380 / speed), easing: 'easeInOut' });

                // Release part locks
                this.engine.unlockParts(this.lockedParts, actionId);
                this.lockedParts = [];
                this.isActive = false;
                this._removeDebugMarker();
                this._notifyProgress('COMPLETED', { targetData, poseData });

                return {
                    success: true,
                    targetData,
                    poseData
                };
            } catch (err) {
                this.cancel();
                console.error('[PointAction] Error during point execution:', err);
                return { success: false, error: err.message };
            }
        }

        /**
         * Safely cancel / interrupt active pointing action
         */
        cancel() {
            if (!this.isActive) return;
            this.isActive = false;
            this.currentActionId = null;

            if (this.engine) {
                this.engine.cancelCurrent();
                if (this.lockedParts.length > 0) {
                    this.engine.unlockParts(this.lockedParts);
                    this.lockedParts = [];
                }
                this.engine.resetAll({ animated: true, duration: 250 });
            }
            this._removeDebugMarker();
            this._notifyProgress('CANCELLED', {});
        }

        _renderDebugMarker(x, y) {
            this._removeDebugMarker();
            const marker = document.createElement('div');
            marker.id = 'buddy-point-debug-marker';
            marker.style.position = 'fixed';
            marker.style.left = `${x - 12}px`;
            marker.style.top = `${y - 12}px`;
            marker.style.width = '24px';
            marker.style.height = '24px';
            marker.style.borderRadius = '50%';
            marker.style.border = '2px solid #38BDF8';
            marker.style.background = 'rgba(56, 189, 248, 0.35)';
            marker.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.8)';
            marker.style.pointerEvents = 'none';
            marker.style.zIndex = '999999';
            marker.style.transition = 'all 0.2s ease';
            marker.innerHTML = '<div style="width: 6px; height: 6px; background: #FFF; border-radius: 50%; margin: 7px auto;"></div>';
            document.body.appendChild(marker);
            this.debugMarker = marker;
        }

        _removeDebugMarker() {
            if (this.debugMarker && this.debugMarker.parentNode) {
                this.debugMarker.parentNode.removeChild(this.debugMarker);
                this.debugMarker = null;
            }
        }

        onProgress(callback) {
            this.listeners.add(callback);
            return () => this.listeners.delete(callback);
        }

        _notifyProgress(phase, data) {
            for (const listener of this.listeners) {
                try {
                    listener({ phase, isActive: this.isActive, ...data });
                } catch (e) {}
            }
        }
    }

    global.PointAction = PointAction;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PointAction;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
