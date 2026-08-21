/**
 * Travel AI Buddy — Step 3: Target Resolver
 * 
 * Converts various target descriptors (DOM elements, selectors, coordinates, UI cards)
 * into screen-relative and Buddy-relative spatial coordinates.
 * 
 * Supports:
 * - { type: "element", targetId: "hotel-card-1" }
 * - { type: "position", x: 820, y: 420 }
 * - DOM HTMLElement references or CSS selectors
 * - Explicit { x, y } coordinates
 */
(function (global) {
    class TargetResolver {
        /**
         * Resolve a target into screen-space and Buddy-relative coordinates
         * @param {string|HTMLElement|object} target
         * @param {HTMLElement} [buddyElement]
         * @returns {object} Resolved spatial data or failure status
         */
        static resolve(target, buddyElement = null) {
            if (!target) {
                target = 'USER';
            }

            let targetX = 0;
            let targetY = 0;
            let targetId = 'custom-target';
            let resolvedElement = null;

            const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
            const winH = typeof window !== 'undefined' ? window.innerHeight : 600;

            const isDomElement = (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) || 
                                 (target && typeof target.getBoundingClientRect === 'function');

            // 1. Resolve target coordinates from DOM or Coordinates
            if (typeof target === 'string') {
                const upper = target.toUpperCase().trim();
                if (upper === 'USER' || upper === 'DEFAULT' || upper === 'CENTER') {
                    targetId = upper;
                    targetX = winW / 2;
                    targetY = winH * 0.45;
                } else if (upper === 'LEFT') {
                    targetId = 'LEFT';
                    targetX = winW * 0.15;
                    targetY = winH * 0.45;
                } else if (upper === 'RIGHT') {
                    targetId = 'RIGHT';
                    targetX = winW * 0.85;
                    targetY = winH * 0.45;
                } else if (upper === 'UP') {
                    targetId = 'UP';
                    targetX = winW / 2;
                    targetY = winH * 0.12;
                } else if (upper === 'DOWN') {
                    targetId = 'DOWN';
                    targetX = winW / 2;
                    targetY = winH * 0.88;
                } else if (upper === 'MAP') {
                    targetId = 'MAP';
                    targetX = winW * 0.25;
                    targetY = winH * 0.3;
                } else if (upper === 'NOTIFICATION') {
                    targetId = 'NOTIFICATION';
                    targetX = winW * 0.85;
                    targetY = winH * 0.18;
                } else if (upper === 'BUTTON' || upper === 'PLACE') {
                    targetId = upper;
                    targetX = winW * 0.35;
                    targetY = winH * 0.6;
                } else {
                    // String ID or Selector
                    targetId = target;
                    resolvedElement = (typeof document !== 'undefined')
                        ? (document.getElementById(target) || document.querySelector(target))
                        : null;

                    if (!resolvedElement) {
                        return { success: false, reason: 'TARGET_NOT_FOUND', targetId: target };
                    }
                    const rect = resolvedElement.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;
                }
            } else if (isDomElement) {
                // Direct DOM Element
                resolvedElement = target;
                targetId = target.id || target.className || 'dom-element';
                const rect = target.getBoundingClientRect();
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
            } else if (typeof target === 'object' && target !== null) {
                if (target.type === 'element' && target.targetId) {
                    targetId = target.targetId;
                    resolvedElement = (typeof document !== 'undefined')
                        ? (document.getElementById(target.targetId) || document.querySelector(target.targetId))
                        : null;

                    if (!resolvedElement) {
                        return { success: false, reason: 'TARGET_NOT_FOUND', targetId: target.targetId };
                    }
                    const rect = resolvedElement.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;
                } else if (target.type === 'pointer') {
                    const ptr = TargetResolver.lastPointerPosition || {
                        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
                        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300
                    };
                    targetX = (target.x !== undefined) ? Number(target.x) : ptr.x;
                    targetY = (target.y !== undefined) ? Number(target.y) : ptr.y;
                    targetId = 'pointer';
                } else if (target.type === 'position' || (target.x !== undefined && target.y !== undefined)) {
                    targetX = Number(target.x) || 0;
                    targetY = Number(target.y) || 0;
                    targetId = target.targetId || `pos_${targetX}_${targetY}`;
                } else if (target.targetId) {
                    targetId = target.targetId;
                    resolvedElement = (typeof document !== 'undefined')
                        ? (document.getElementById(target.targetId) || document.querySelector(target.targetId))
                        : null;

                    if (!resolvedElement) {
                        return { success: false, reason: 'TARGET_NOT_FOUND', targetId: target.targetId };
                    }
                    const rect = resolvedElement.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;
                } else if (typeof target.getBoundingClientRect === 'function') {
                    const rect = target.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;
                    targetId = target.id || 'custom-element';
                } else {
                    return { success: false, reason: 'INVALID_TARGET_FORMAT', target };
                }
            } else {
                return { success: false, reason: 'UNSUPPORTED_TARGET_TYPE', target };
            }

            // 2. Resolve Buddy character origin in viewport
            let buddyX = typeof window !== 'undefined' ? window.innerWidth - 120 : 500;
            let buddyY = typeof window !== 'undefined' ? window.innerHeight - 150 : 500;

            const buddyDom = buddyElement || (typeof document !== 'undefined' ? document.getElementById('travel-buddy-root') : null);
            if (buddyDom && typeof buddyDom.getBoundingClientRect === 'function') {
                const bRect = buddyDom.getBoundingClientRect();
                buddyX = bRect.left + bRect.width / 2;
                buddyY = bRect.top + bRect.height * 0.45; // Center around chest/shoulders
            }

            // 3. Compute vector, distance, and angles
            const dx = targetX - buddyX;
            const dy = targetY - buddyY;
            const distance = Math.hypot(dx, dy);
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180) / Math.PI;

            // Determine pointing arm (Screen Left Arm vs Screen Right Arm)
            // If target is to the left (dx < 0), use left arm; if right (dx >= 0), use right arm
            const pointingArm = dx < 0 ? 'left' : 'right';

            return {
                success: true,
                targetId,
                element: resolvedElement,
                targetX,
                targetY,
                buddyX,
                buddyY,
                dx,
                dy,
                distance,
                angleRad,
                angleDeg,
                pointingArm
            };
        }
    }

    TargetResolver.lastPointerPosition = null;

    TargetResolver.updatePointerPosition = function (x, y) {
        TargetResolver.lastPointerPosition = { x: Number(x) || 0, y: Number(y) || 0 };
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('pointermove', (e) => {
            TargetResolver.lastPointerPosition = { x: e.clientX, y: e.clientY };
        }, { passive: true });
    }

    global.TargetResolver = TargetResolver;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TargetResolver;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
