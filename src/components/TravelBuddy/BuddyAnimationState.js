/**
 * Travel AI Buddy — Step 2: Animation State, Priority & Easing System
 * 
 * Manages:
 * - Animation Priorities (IDLE, NORMAL, IMPORTANT, CRITICAL)
 * - Easing Functions (linear, easeIn, easeOut, easeInOut, easeOutBack, spring, etc.)
 * - Part-Level Ownership & Lock Management
 * - Transform Interpolation & Composition
 */
(function (global) {
    // Animation Priority Levels
    const AnimationPriority = {
        IDLE: 1,
        NORMAL: 2,
        IMPORTANT: 3,
        CRITICAL: 4
    };

    // Easing Mathematical Functions (0.0 to 1.0)
    const Easing = {
        linear: (t) => t,
        
        easeInQuad: (t) => t * t,
        easeOutQuad: (t) => t * (2 - t),
        easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

        easeInCubic: (t) => t * t * t,
        easeOutCubic: (t) => (--t) * t * t + 1,
        easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

        easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
        easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
        easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

        easeOutBack: (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        easeInBack: (t) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        },
        easeInOutBack: (t) => {
            const c1 = 1.70158;
            const c2 = c1 * 1.525;
            return t < 0.5
                ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
        },

        spring: (t) => {
            return 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 4);
        }
    };

    // Aliases for developer convenience
    Easing.easeIn = Easing.easeInQuad;
    Easing.easeOut = Easing.easeOutQuad;
    Easing.easeInOut = Easing.easeInOutQuad;

    /**
     * Resolves easing function from string name or custom function
     */
    function resolveEasing(easing) {
        if (typeof easing === 'function') return easing;
        if (typeof easing === 'string' && Easing[easing]) {
            return Easing[easing];
        }
        return Easing.easeOutQuad;
    }

    /**
     * Part-Level Lock & Ownership Manager
     * Prevents competing systems (e.g. idle breathing vs active gesture) from fighting over the same SVG elements.
     */
    class BuddyPartLockManager {
        constructor() {
            // partKey -> { ownerId, priority, lockedAt }
            this.locks = new Map();
        }

        /**
         * Attempt to acquire lock on one or more parts
         * @param {string|string[]} parts
         * @param {string} ownerId
         * @param {number} priority (1=IDLE, 2=NORMAL, 3=IMPORTANT, 4=CRITICAL)
         * @returns {boolean} true if lock acquired on all requested parts
         */
        acquire(parts, ownerId, priority = AnimationPriority.NORMAL) {
            const partList = Array.isArray(parts) ? parts : [parts];
            
            // Check if any part is locked by a higher priority owner
            for (const part of partList) {
                const currentLock = this.locks.get(part);
                if (currentLock && currentLock.ownerId !== ownerId) {
                    if (currentLock.priority > priority) {
                        return false; // Cannot override higher priority lock
                    }
                }
            }

            // Acquire or upgrade locks
            const now = Date.now();
            for (const part of partList) {
                this.locks.set(part, {
                    ownerId,
                    priority,
                    lockedAt: now
                });
            }
            return true;
        }

        /**
         * Release lock on one or more parts
         * @param {string|string[]} parts
         * @param {string} [ownerId] If provided, only releases if owned by ownerId
         */
        release(parts, ownerId = null) {
            const partList = Array.isArray(parts) ? parts : [parts];
            for (const part of partList) {
                if (this.locks.has(part)) {
                    if (!ownerId || this.locks.get(part).ownerId === ownerId) {
                        this.locks.delete(part);
                    }
                }
            }
        }

        /**
         * Check if a part is currently locked
         */
        isLocked(part, requestingOwnerId = null, requestingPriority = AnimationPriority.NORMAL) {
            const lock = this.locks.get(part);
            if (!lock) return false;
            if (requestingOwnerId && lock.ownerId === requestingOwnerId) return false;
            return lock.priority >= requestingPriority;
        }

        /**
         * Get lock information for a part
         */
        getLock(part) {
            return this.locks.get(part) || null;
        }

        /**
         * Get list of all currently locked parts
         */
        getLockedParts() {
            return Array.from(this.locks.keys());
        }

        /**
         * Release all locks
         */
        clear() {
            this.locks.clear();
        }
    }

    /**
     * Interpolates between start and target transform states
     */
    function interpolateTransform(startState, targetProperties, progress) {
        const result = { ...startState };
        const p = Math.max(0, Math.min(1, progress));

        // Rotation
        if (targetProperties.rotation !== undefined) {
            const startRot = startState.rotation || 0;
            result.rotation = startRot + (targetProperties.rotation - startRot) * p;
        }

        // Translation (supports both x/translateX and y/translateY)
        const targetX = targetProperties.translateX !== undefined ? targetProperties.translateX : targetProperties.x;
        if (targetX !== undefined) {
            const startX = startState.x || 0;
            result.x = startX + (targetX - startX) * p;
        }

        const targetY = targetProperties.translateY !== undefined ? targetProperties.translateY : targetProperties.y;
        if (targetY !== undefined) {
            const startY = startState.y || 0;
            result.y = startY + (targetY - startY) * p;
        }

        // Scale
        if (targetProperties.scaleX !== undefined) {
            const startSx = startState.scaleX !== undefined ? startState.scaleX : 1;
            result.scaleX = startSx + (targetProperties.scaleX - startSx) * p;
        }
        if (targetProperties.scaleY !== undefined) {
            const startSy = startState.scaleY !== undefined ? startState.scaleY : 1;
            result.scaleY = startSy + (targetProperties.scaleY - startSy) * p;
        }
        if (targetProperties.scale !== undefined) {
            const startSx = startState.scaleX !== undefined ? startState.scaleX : 1;
            const startSy = startState.scaleY !== undefined ? startState.scaleY : 1;
            result.scaleX = startSx + (targetProperties.scale - startSx) * p;
            result.scaleY = startSy + (targetProperties.scale - startSy) * p;
        }

        // Opacity
        if (targetProperties.opacity !== undefined) {
            const startOp = startState.opacity !== undefined ? startState.opacity : 1;
            result.opacity = startOp + (targetProperties.opacity - startOp) * p;
        }

        return result;
    }

    const BuddyAnimationState = {
        AnimationPriority,
        Easing,
        resolveEasing,
        BuddyPartLockManager,
        interpolateTransform
    };

    global.BuddyAnimationState = BuddyAnimationState;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyAnimationState;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
