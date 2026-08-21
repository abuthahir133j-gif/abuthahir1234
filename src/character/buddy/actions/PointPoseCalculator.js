/**
 * Travel AI Buddy — Step 3: Point Pose Calculator & Arm IK System
 * 
 * Computes natural anatomical joint rotations, eye gaze offsets, and torso leans
 * for pointing toward a target in any direction (Left, Right, Up, Down, Diagonal).
 */
(function (global) {
    class PointPoseCalculator {
        /**
         * Calculate full multi-joint pointing pose from target resolution data
         * @param {object} targetData Result from TargetResolver.resolve()
         * @returns {object} Calculated poses for all involved body parts
         */
        static calculatePose(targetData) {
            const { dx, dy, angleDeg, pointingArm, distance } = targetData;

            // 1. Eye Gaze Calculation (Clamped to safe visor dome area)
            const maxEyeX = 10;
            const maxEyeY = 6;
            const eyeDistNorm = Math.min(1, distance / 400);

            // Compute unit direction
            const len = Math.hypot(dx, dy) || 1;
            const eyeUnitX = dx / len;
            const eyeUnitY = dy / len;

            const eyeX = Math.round(eyeUnitX * maxEyeX * eyeDistNorm);
            const eyeY = Math.round(eyeUnitY * maxEyeY * eyeDistNorm);

            // 2. Head Rotation Calculation (Clamped to natural neck range)
            const maxHeadAngle = 26;
            let targetHeadAngle = 0;

            if (dx < 0) {
                // Pointing to left: head rotates negative (left)
                targetHeadAngle = Math.max(-maxHeadAngle, Math.min(-4, (dx / 400) * maxHeadAngle));
            } else {
                // Pointing to right: head rotates positive (right)
                targetHeadAngle = Math.min(maxHeadAngle, Math.max(4, (dx / 400) * maxHeadAngle));
            }

            // Vertical influence on head pitch (subtle translation Y)
            const headY = Math.max(-8, Math.min(6, (dy / 300) * 8));

            // 3. Body Torso Lean (Subtle weight shift toward target)
            const maxBodyLean = 8;
            const bodyLean = Math.max(-maxBodyLean, Math.min(maxBodyLean, (dx / 500) * maxBodyLean));

            // 4. Arm Kinematics & IK Calculation
            // Neutral upper arms hang vertically down (~0 deg).
            // When elevating to point:
            //   - Right arm rotates counter-clockwise (negative angle, e.g. -30° to -85°)
            //   - Left arm rotates clockwise (positive angle, e.g. +30° to +85°)
            const isRight = pointingArm === 'right';

            // Base elevation derived from vertical and horizontal vector
            let armBaseAngle = 0;
            let elbowFlexAngle = 0;
            let wristAlignAngle = 0;

            if (isRight) {
                // Right Arm (Screen Right, pointing right/up/down)
                if (dy < -60) {
                    // Pointing UP-RIGHT
                    armBaseAngle = -65;
                    elbowFlexAngle = -35;
                    wristAlignAngle = -20;
                } else if (dy > 80) {
                    // Pointing DOWN-RIGHT
                    armBaseAngle = -28;
                    elbowFlexAngle = -15;
                    wristAlignAngle = -10;
                } else {
                    // Pointing FORWARD-RIGHT (Center / Mid-height)
                    armBaseAngle = -48;
                    elbowFlexAngle = -28;
                    wristAlignAngle = -18;
                }
            } else {
                // Left Arm (Screen Left, pointing left/up/down)
                if (dy < -60) {
                    // Pointing UP-LEFT
                    armBaseAngle = 65;
                    elbowFlexAngle = 35;
                    wristAlignAngle = 20;
                } else if (dy > 80) {
                    // Pointing DOWN-LEFT
                    armBaseAngle = 28;
                    elbowFlexAngle = 15;
                    wristAlignAngle = 10;
                } else {
                    // Pointing FORWARD-LEFT (Center / Mid-height)
                    armBaseAngle = 48;
                    elbowFlexAngle = 28;
                    wristAlignAngle = 18;
                }
            }

            // Scale arm extension slightly based on distance
            const extRatio = Math.min(1.2, Math.max(0.8, distance / 350));
            const upperArmRot = Math.round(armBaseAngle * extRatio);
            const forearmRot = Math.round(elbowFlexAngle * extRatio);
            const handRot = Math.round(wristAlignAngle);

            const activeArmKey = isRight ? 'right' : 'left';
            const upperArmKey = isRight ? 'rightUpperArm' : 'leftUpperArm';
            const forearmKey = isRight ? 'rightForearm' : 'leftForearm';
            const handKey = isRight ? 'rightHand' : 'leftHand';

            // 5. Anticipation Pose (Slight opposite recoil before extending arm)
            const anticipation = {
                body: { rotation: Math.round(-bodyLean * 0.4) },
                head: { rotation: Math.round(-targetHeadAngle * 0.2) },
                [upperArmKey]: { rotation: Math.round(-armBaseAngle * 0.15) }
            };

            // 6. Follow-through / Settle Target Offset
            const followThrough = {
                [upperArmKey]: { rotation: Math.round(upperArmRot * 1.05) },
                [forearmKey]: { rotation: Math.round(forearmRot * 1.08) },
                [handKey]: { rotation: Math.round(handRot * 1.1) }
            };

            return {
                pointingArm: activeArmKey,
                parts: {
                    upperArmKey,
                    forearmKey,
                    handKey
                },
                // Target Final Keyframe Pose
                pose: {
                    eyes: { x: eyeX, y: eyeY },
                    head: { rotation: targetHeadAngle, y: headY },
                    body: { rotation: bodyLean },
                    [upperArmKey]: { rotation: upperArmRot },
                    [forearmKey]: { rotation: forearmRot },
                    [handKey]: { rotation: handRot }
                },
                anticipation,
                followThrough,
                metrics: {
                    targetAngleDeg: Math.round(angleDeg),
                    headAngleDeg: Math.round(targetHeadAngle),
                    upperArmAngleDeg: Math.round(upperArmRot),
                    forearmAngleDeg: Math.round(forearmRot),
                    handAngleDeg: Math.round(handRot),
                    distance: Math.round(distance)
                }
            };
        }
    }

    global.PointPoseCalculator = PointPoseCalculator;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PointPoseCalculator;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
