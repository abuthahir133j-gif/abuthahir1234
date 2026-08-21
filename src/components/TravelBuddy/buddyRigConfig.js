/**
 * Travel AI Buddy — Step 1: Central Rig Configuration & Part Hierarchy
 * 
 * Defines the complete controllable SVG rig architecture for AI/png.svg:
 * - Locked character asset configuration
 * - Part hierarchy
 * - Stable DOM IDs
 * - Pivot points (transform-origin in SVG coordinates: 672x1024 canvas)
 * - Default rest poses / transform limits
 */
(function (global) {
    // Single Source of Truth for Buddy Asset (Locked)
    const buddyCharacterConfig = {
        asset: 'AI/png.svg',
        allowCharacterSwap: false,
        locked: true
    };

    const BUDDY_RIG_CONFIG = {
        character: buddyCharacterConfig,

        canvas: {
            viewBox: '0 0 672 1024',
            width: 672,
            height: 1024
        },

        // Controllable Body Parts Definition for AI/png.svg
        parts: {
            // Root Wrapper
            root: {
                id: 'buddy-root',
                name: 'Buddy Root',
                pivot: { x: 336, y: 512 },
                parent: null,
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -100, maxX: 100, minY: -100, maxY: 100 }
            },

            // Robot Main Capsule Frame
            robot: {
                id: 'buddy-robot',
                name: 'Robot Frame',
                pivot: { x: 336, y: 512 },
                parent: 'root',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -30, maxRot: 30, minX: -50, maxX: 50, minY: -50, maxY: 50 }
            },

            // Torso / Body
            body: {
                id: 'buddy-body',
                name: 'Torso / Body',
                pivot: { x: 336, y: 570 },
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -30, maxRot: 30, minX: -40, maxX: 40, minY: -40, maxY: 40 }
            },

            // Head Assembly (Rotates around neck base 336, 465)
            head: {
                id: 'buddy-head',
                name: 'Head',
                pivot: { x: 336, y: 465 }, // Neck base joint
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -40, maxX: 40, minY: -30, maxY: 30 }
            },

            // Facial Features
            face: {
                id: 'buddy-face-features',
                name: 'Face Group',
                pivot: { x: 336, y: 325 },
                parent: 'head',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -20, maxRot: 20, minX: -30, maxX: 30, minY: -25, maxY: 25 }
            },
            leftEye: {
                id: 'buddy-left-eye',
                name: 'Left Eye',
                pivot: { x: 270, y: 325 },
                parent: 'face',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -20, maxY: 20 }
            },
            rightEye: {
                id: 'buddy-right-eye',
                name: 'Right Eye',
                pivot: { x: 405, y: 325 },
                parent: 'face',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -20, maxY: 20 }
            },
            mouth: {
                id: 'buddy-mouth',
                name: 'Mouth',
                pivot: { x: 336, y: 375 },
                parent: 'face',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -30, maxRot: 30, minX: -20, maxX: 20, minY: -20, maxY: 20 }
            },

            // Left Arm Chain (Screen Left)
            leftArm: {
                id: 'buddy-left-arm',
                name: 'Left Arm (Full)',
                pivot: { x: 195, y: 520 }, // Shoulder Joint
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -110, maxRot: 110, minX: -60, maxX: 60, minY: -60, maxY: 60 }
            },
            leftUpperArm: {
                id: 'buddy-left-upper-arm',
                name: 'Left Upper Arm',
                pivot: { x: 195, y: 520 }, // Shoulder Joint
                parent: 'leftArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -110, maxRot: 110, minX: -50, maxX: 50, minY: -50, maxY: 50 }
            },
            leftForearm: {
                id: 'buddy-left-forearm',
                name: 'Left Forearm',
                pivot: { x: 155, y: 625 }, // Elbow Joint
                parent: 'leftArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -90, maxRot: 90, minX: -40, maxX: 40, minY: -40, maxY: 40 }
            },
            leftHand: {
                id: 'buddy-left-hand',
                name: 'Left Hand / Wrist',
                pivot: { x: 145, y: 725 }, // Wrist Joint
                parent: 'leftArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -80, maxRot: 80, minX: -30, maxX: 30, minY: -30, maxY: 30 }
            },

            // Right Arm Chain (Screen Right)
            rightArm: {
                id: 'buddy-right-arm',
                name: 'Right Arm (Full)',
                pivot: { x: 475, y: 520 }, // Shoulder Joint
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -110, maxRot: 110, minX: -60, maxX: 60, minY: -60, maxY: 60 }
            },
            rightUpperArm: {
                id: 'buddy-right-upper-arm',
                name: 'Right Upper Arm',
                pivot: { x: 475, y: 520 }, // Shoulder Joint
                parent: 'rightArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -110, maxRot: 110, minX: -50, maxX: 50, minY: -50, maxY: 50 }
            },
            rightForearm: {
                id: 'buddy-right-forearm',
                name: 'Right Forearm',
                pivot: { x: 515, y: 625 }, // Elbow Joint
                parent: 'rightArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -90, maxRot: 90, minX: -40, maxX: 40, minY: -40, maxY: 40 }
            },
            rightHand: {
                id: 'buddy-right-hand',
                name: 'Right Hand / Wrist',
                pivot: { x: 525, y: 725 }, // Wrist Joint
                parent: 'rightArm',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -80, maxRot: 80, minX: -30, maxX: 30, minY: -30, maxY: 30 }
            },

            // Left Leg Chain
            leftLeg: {
                id: 'buddy-left-leg',
                name: 'Left Leg (Full)',
                pivot: { x: 260, y: 680 },
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -30, maxX: 30, minY: -30, maxY: 30 }
            },
            leftThigh: {
                id: 'buddy-left-thigh',
                name: 'Left Thigh',
                pivot: { x: 260, y: 680 },
                parent: 'leftLeg',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -25, maxY: 25 }
            },
            leftFoot: {
                id: 'buddy-left-foot',
                name: 'Left Foot / Shin',
                pivot: { x: 250, y: 780 },
                parent: 'leftLeg',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -25, maxY: 25 }
            },

            // Right Leg Chain
            rightLeg: {
                id: 'buddy-right-leg',
                name: 'Right Leg (Full)',
                pivot: { x: 410, y: 680 },
                parent: 'robot',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -30, maxX: 30, minY: -30, maxY: 30 }
            },
            rightThigh: {
                id: 'buddy-right-thigh',
                name: 'Right Thigh',
                pivot: { x: 410, y: 680 },
                parent: 'rightLeg',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -25, maxY: 25 }
            },
            rightFoot: {
                id: 'buddy-right-foot',
                name: 'Right Foot / Shin',
                pivot: { x: 420, y: 780 },
                parent: 'rightLeg',
                defaultState: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                limits: { minRot: -45, maxRot: 45, minX: -25, maxX: 25, minY: -25, maxY: 25 }
            }
        },

        // Convenient Aliases & Group Mappings
        aliases: {
            'head': 'head',
            'buddy-head': 'head',
            'body': 'body',
            'torso': 'body',
            'buddy-body': 'body',
            'robot': 'robot',
            'buddy-robot': 'robot',

            'left-eye': 'leftEye',
            'buddy-left-eye': 'leftEye',
            'right-eye': 'rightEye',
            'buddy-right-eye': 'rightEye',
            'eyes': 'face',
            'face': 'face',
            'mouth': 'mouth',
            'buddy-mouth': 'mouth',

            'left-arm': 'leftArm',
            'buddy-left-arm': 'leftArm',
            'left-upper-arm': 'leftUpperArm',
            'buddy-left-upper-arm': 'leftUpperArm',
            'left-forearm': 'leftForearm',
            'buddy-left-forearm': 'leftForearm',
            'left-hand': 'leftHand',
            'buddy-left-hand': 'leftHand',

            'right-arm': 'rightArm',
            'buddy-right-arm': 'rightArm',
            'right-upper-arm': 'rightUpperArm',
            'buddy-right-upper-arm': 'rightUpperArm',
            'right-forearm': 'rightForearm',
            'buddy-right-forearm': 'rightForearm',
            'right-hand': 'rightHand',
            'buddy-right-hand': 'rightHand',

            'left-leg': 'leftLeg',
            'buddy-left-leg': 'leftLeg',
            'left-thigh': 'leftThigh',
            'buddy-left-thigh': 'leftThigh',
            'left-foot': 'leftFoot',
            'buddy-left-foot': 'leftFoot',

            'right-leg': 'rightLeg',
            'buddy-right-leg': 'rightLeg',
            'right-thigh': 'rightThigh',
            'buddy-right-thigh': 'rightThigh',
            'right-foot': 'rightFoot',
            'buddy-right-foot': 'rightFoot'
        }
    };

    global.buddyCharacterConfig = buddyCharacterConfig;
    global.BUDDY_RIG_CONFIG = BUDDY_RIG_CONFIG;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            buddyCharacterConfig,
            BUDDY_RIG_CONFIG
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
