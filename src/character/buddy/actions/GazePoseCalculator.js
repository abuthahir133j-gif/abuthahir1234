/**
 * Travel AI Buddy — Step 4: Gaze Pose Calculator
 * 
 * Computes natural eye gaze offsets, neck/head yaw & pitch, and subtle torso reactions
 * within strict anatomical safety limits for AI/png.svg.
 * 
 * Guarantees:
 * - Eyes move within visor bounds (MAX_EYE_X, MAX_EYE_Y)
 * - Head rotates within neck range (MAX_HEAD_ROTATION)
 * - Arms, hands, fingers, and legs remain strictly stationary (0 transform)
 * - Pure stateless calculations with zero drift
 */
(function (global) {
    const DEFAULT_LIMITS = {
        MAX_EYE_X: 12,          // Visor horizontal eye clamp (px)
        MAX_EYE_Y: 8,           // Visor vertical eye clamp (px)
        MAX_HEAD_ROTATION: 24,  // Neck rotation clamp (deg)
        MAX_HEAD_Y: 6,          // Head pitch / vertical translate clamp (px)
        MAX_BODY_LEAN: 4        // Subtle torso lean reaction clamp (deg)
    };

    class GazePoseCalculator {
        /**
         * Calculate gaze pose from spatial target data
         * @param {object} targetData Result from TargetResolver.resolve()
         * @param {object} [customLimits] Optional limit overrides
         * @returns {object} Calculated gaze pose with strict limits & timings
         */
        static calculateGaze(targetData, customLimits = {}) {
            if (!targetData || !targetData.success) {
                return null;
            }

            const limits = { ...DEFAULT_LIMITS, ...customLimits };
            const { dx, dy, distance, angleDeg } = targetData;

            // 1. Eye Direction Vector & Visor Boundary Clamping
            const len = Math.hypot(dx, dy) || 1;
            const eyeUnitX = dx / len;
            const eyeUnitY = dy / len;

            // Distance scaling (smooth attenuation for nearby targets)
            const distFactor = Math.min(1, Math.max(0.15, distance / 350));

            const rawEyeX = eyeUnitX * limits.MAX_EYE_X * distFactor;
            const rawEyeY = eyeUnitY * limits.MAX_EYE_Y * distFactor;

            // Clamp eyes strictly within natural visual boundary
            const eyeX = Math.max(-limits.MAX_EYE_X, Math.min(limits.MAX_EYE_X, Math.round(rawEyeX * 10) / 10));
            const eyeY = Math.max(-limits.MAX_EYE_Y, Math.min(limits.MAX_EYE_Y, Math.round(rawEyeY * 10) / 10));

            // 2. Head Follow & Neck Rotation Clamping
            // Head follows eye direction with smooth proportional angle
            const headAngleRatio = Math.max(-1, Math.min(1, dx / 400));
            const rawHeadRotation = headAngleRatio * limits.MAX_HEAD_ROTATION;
            const headRotation = Math.max(-limits.MAX_HEAD_ROTATION, Math.min(limits.MAX_HEAD_ROTATION, Math.round(rawHeadRotation * 10) / 10));

            // Head subtle pitch (translate Y) based on vertical delta
            const headYRatio = Math.max(-1, Math.min(1, dy / 300));
            const rawHeadY = headYRatio * limits.MAX_HEAD_Y;
            const headY = Math.max(-limits.MAX_HEAD_Y, Math.min(limits.MAX_HEAD_Y, Math.round(rawHeadY * 10) / 10));

            // 3. Subtle Body Reaction (Torso Lean)
            const bodyLeanRatio = Math.max(-1, Math.min(1, dx / 600));
            const rawBodyLean = bodyLeanRatio * limits.MAX_BODY_LEAN;
            const bodyLean = Math.max(-limits.MAX_BODY_LEAN, Math.min(limits.MAX_BODY_LEAN, Math.round(rawBodyLean * 10) / 10));

            return {
                limits,
                metrics: {
                    dx: Math.round(dx),
                    dy: Math.round(dy),
                    distance: Math.round(distance),
                    angleDeg: Math.round(angleDeg),
                    eyeX,
                    eyeY,
                    headRotation,
                    headY,
                    bodyLean
                },
                // Part-by-part target transform properties
                pose: {
                    leftEye: { x: eyeX, y: eyeY },
                    rightEye: { x: eyeX, y: eyeY },
                    head: { rotation: headRotation, y: headY },
                    body: { rotation: bodyLean }
                },
                // Staggered natural timings
                timing: {
                    eyesDelay: 0,
                    eyesDuration: 220,
                    headDelay: 100,
                    headDuration: 300,
                    bodyDelay: 100,
                    bodyDuration: 320
                }
            };
        }

        static get DEFAULT_LIMITS() {
            return { ...DEFAULT_LIMITS };
        }
    }

    global.GazePoseCalculator = GazePoseCalculator;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GazePoseCalculator;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
