/**
 * Travel AI Buddy — Step 5: Face Pose Calculator
 * 
 * Computes facial part transforms for supported emotions:
 * - NEUTRAL
 * - HAPPY
 * - SURPRISED
 * - THINKING
 * - CONFUSED
 * - SAD
 * 
 * Provides composition utilities to combine:
 * BASE FACE + EMOTION POSE + GAZE OFFSET + BLINK OVERLAY
 * 
 * Rules:
 * - Only uses available parts in AI/png.svg (leftEye, rightEye, mouth, head, face).
 * - Small, natural movements based on character geometry.
 * - Eyebrows/pupils reported gracefully as unavailable if queried.
 */
(function (global) {
    const EMOTIONS = Object.freeze({
        NEUTRAL: 'neutral',
        HAPPY: 'happy',
        SURPRISED: 'surprised',
        THINKING: 'thinking',
        CONFUSED: 'confused',
        SAD: 'sad'
    });

    const DEFAULT_EMOTION_LIMITS = Object.freeze({
        MAX_EYE_SCALE_X: 1.35,
        MIN_EYE_SCALE_X: 0.75,
        MAX_EYE_SCALE_Y: 1.4,
        MIN_EYE_SCALE_Y: 0.05,
        MAX_EYE_OFFSET_X: 12,
        MAX_EYE_OFFSET_Y: 10,
        MAX_MOUTH_SCALE_X: 1.3,
        MIN_MOUTH_SCALE_X: 0.75,
        MAX_MOUTH_SCALE_Y: 1.45,
        MIN_MOUTH_SCALE_Y: 0.7,
        MAX_MOUTH_OFFSET_Y: 8,
        MAX_HEAD_ROTATION: 10,
        MAX_HEAD_Y: 6
    });

    class FacePoseCalculator {
        /**
         * Get available emotions list
         */
        static getSupportedEmotions() {
            return Object.values(EMOTIONS);
        }

        /**
         * Calculate facial part transforms for a given emotion and intensity
         * @param {string} emotion e.g. 'happy', 'surprised', 'thinking', 'confused', 'sad', 'neutral'
         * @param {number} [intensity=1] 0.0 to 1.0
         * @returns {object} Emotion pose definition
         */
        static calculateEmotionPose(emotion = EMOTIONS.NEUTRAL, intensity = 1) {
            const rawEmotion = (typeof emotion === 'string') ? emotion.toLowerCase().trim() : EMOTIONS.NEUTRAL;
            const clampedIntensity = Math.max(0, Math.min(1.5, Number(intensity) || 1));

            // Baseline neutral pose (always exact 1.0 scale and 0 translation/rotation)
            const neutralPose = {
                leftEye: { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, opacity: 1 },
                rightEye: { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, opacity: 1 },
                mouth: { scaleX: 1, scaleY: 1, x: 0, y: 0, rotation: 0, opacity: 1 },
                head: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 },
                face: { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }
            };

            let emotionData = {
                emotion: rawEmotion,
                intensity: clampedIntensity,
                pose: { ...neutralPose },
                timing: { duration: 350, easing: 'easeInOutCubic' },
                description: 'Neutral default face'
            };

            switch (rawEmotion) {
                case EMOTIONS.HAPPY:
                    // Subtle eye arching/squinting, mouth slightly raised, subtle head lift
                    emotionData.pose = {
                        leftEye: {
                            scaleX: 1 + (0.06 * clampedIntensity),
                            scaleY: Math.max(0.7, 1 - (0.14 * clampedIntensity)),
                            x: 0,
                            y: -2 * clampedIntensity,
                            rotation: 0
                        },
                        rightEye: {
                            scaleX: 1 + (0.06 * clampedIntensity),
                            scaleY: Math.max(0.7, 1 - (0.14 * clampedIntensity)),
                            x: 0,
                            y: -2 * clampedIntensity,
                            rotation: 0
                        },
                        mouth: {
                            scaleX: 1 + (0.12 * clampedIntensity),
                            scaleY: 1 + (0.15 * clampedIntensity),
                            x: 0,
                            y: -3 * clampedIntensity,
                            rotation: 0
                        },
                        head: {
                            rotation: 2 * clampedIntensity,
                            y: -2 * clampedIntensity,
                            x: 0
                        },
                        face: {
                            y: -1 * clampedIntensity,
                            x: 0,
                            rotation: 0
                        }
                    };
                    emotionData.timing = { duration: 320, easing: 'easeOutBack' };
                    emotionData.description = 'Subtle cheerful squint, elevated smile, micro head lift';
                    break;

                case EMOTIONS.SURPRISED:
                    // Widened eyes, open dropped mouth, slight head lift
                    emotionData.pose = {
                        leftEye: {
                            scaleX: 1 + (0.18 * clampedIntensity),
                            scaleY: 1 + (0.24 * clampedIntensity),
                            x: 0,
                            y: -3 * clampedIntensity,
                            rotation: 0
                        },
                        rightEye: {
                            scaleX: 1 + (0.18 * clampedIntensity),
                            scaleY: 1 + (0.24 * clampedIntensity),
                            x: 0,
                            y: -3 * clampedIntensity,
                            rotation: 0
                        },
                        mouth: {
                            scaleX: Math.max(0.8, 1 - (0.1 * clampedIntensity)),
                            scaleY: 1 + (0.32 * clampedIntensity),
                            x: 0,
                            y: 4 * clampedIntensity,
                            rotation: 0
                        },
                        head: {
                            rotation: 0,
                            y: -4 * clampedIntensity,
                            x: 0
                        },
                        face: {
                            y: -2 * clampedIntensity,
                            x: 0,
                            rotation: 0
                        }
                    };
                    emotionData.timing = { duration: 260, easing: 'easeOutBack' };
                    emotionData.description = 'Widened eyes, open dropped mouth, elevated head';
                    break;

                case EMOTIONS.THINKING:
                    // Eyes look slightly upward-right, slight pursed mouth, inquisitive head tilt (zero arm movement)
                    emotionData.pose = {
                        leftEye: {
                            scaleX: 1,
                            scaleY: Math.max(0.85, 1 - (0.06 * clampedIntensity)),
                            x: 4 * clampedIntensity,
                            y: -5 * clampedIntensity,
                            rotation: 0
                        },
                        rightEye: {
                            scaleX: 1,
                            scaleY: Math.max(0.85, 1 - (0.06 * clampedIntensity)),
                            x: 4 * clampedIntensity,
                            y: -5 * clampedIntensity,
                            rotation: 0
                        },
                        mouth: {
                            scaleX: Math.max(0.85, 1 - (0.12 * clampedIntensity)),
                            scaleY: 1,
                            x: -2 * clampedIntensity,
                            y: 0,
                            rotation: 0
                        },
                        head: {
                            rotation: 6 * clampedIntensity, // Inquisitive head tilt
                            y: -2 * clampedIntensity,
                            x: 0
                        },
                        face: {
                            x: 2 * clampedIntensity,
                            y: -2 * clampedIntensity,
                            rotation: 0
                        }
                    };
                    emotionData.timing = { duration: 400, easing: 'easeInOutCubic' };
                    emotionData.description = 'Eyes upward-right, pursed mouth, subtle head tilt';
                    break;

                case EMOTIONS.CONFUSED:
                    // Asymmetric eyes (left squinted, right wide), angled mouth, inquisitive head tilt
                    emotionData.pose = {
                        leftEye: {
                            scaleX: 1 + (0.05 * clampedIntensity),
                            scaleY: Math.max(0.75, 1 - (0.16 * clampedIntensity)),
                            x: -2 * clampedIntensity,
                            y: 1 * clampedIntensity,
                            rotation: 0
                        },
                        rightEye: {
                            scaleX: 1 + (0.12 * clampedIntensity),
                            scaleY: 1 + (0.16 * clampedIntensity),
                            x: -2 * clampedIntensity,
                            y: -3 * clampedIntensity,
                            rotation: 0
                        },
                        mouth: {
                            scaleX: 1,
                            scaleY: 1,
                            x: 2 * clampedIntensity,
                            y: 0,
                            rotation: -4 * clampedIntensity
                        },
                        head: {
                            rotation: -7 * clampedIntensity,
                            y: 1 * clampedIntensity,
                            x: 0
                        },
                        face: {
                            x: -1 * clampedIntensity,
                            y: 0,
                            rotation: -2 * clampedIntensity
                        }
                    };
                    emotionData.timing = { duration: 360, easing: 'easeInOut' };
                    emotionData.description = 'Asymmetric eye expression, angled mouth, puzzled head tilt';
                    break;

                case EMOTIONS.SAD:
                    // Drooped eyes, lowered mouth, lowered head
                    emotionData.pose = {
                        leftEye: {
                            scaleX: Math.max(0.85, 1 - (0.08 * clampedIntensity)),
                            scaleY: Math.max(0.8, 1 - (0.15 * clampedIntensity)),
                            x: 0,
                            y: 3 * clampedIntensity,
                            rotation: 0
                        },
                        rightEye: {
                            scaleX: Math.max(0.85, 1 - (0.08 * clampedIntensity)),
                            scaleY: Math.max(0.8, 1 - (0.15 * clampedIntensity)),
                            x: 0,
                            y: 3 * clampedIntensity,
                            rotation: 0
                        },
                        mouth: {
                            scaleX: 1,
                            scaleY: Math.max(0.8, 1 - (0.15 * clampedIntensity)),
                            x: 0,
                            y: 4 * clampedIntensity,
                            rotation: 0
                        },
                        head: {
                            rotation: -3 * clampedIntensity,
                            y: 4 * clampedIntensity,
                            x: 0
                        },
                        face: {
                            y: 3 * clampedIntensity,
                            x: 0,
                            rotation: 0
                        }
                    };
                    emotionData.timing = { duration: 380, easing: 'easeInOut' };
                    emotionData.description = 'Lowered eyes, downward mouth, lowered head';
                    break;

                case EMOTIONS.NEUTRAL:
                default:
                    emotionData.emotion = EMOTIONS.NEUTRAL;
                    emotionData.pose = neutralPose;
                    emotionData.timing = { duration: 300, easing: 'easeInOut' };
                    emotionData.description = 'Original neutral rest pose';
                    break;
            }

            return emotionData;
        }

        /**
         * Safely compose an Emotion Pose with an active Gaze Offset
         * Preserves emotional scale & shape while applying gaze directional translations & rotations.
         * @param {object} emotionPose Output of calculateEmotionPose()
         * @param {object} [gazePose] Output of GazePoseCalculator
         * @returns {object} Composed final transforms
         */
        static composeEmotionWithGaze(emotionPose, gazePose = null) {
            const base = emotionPose?.pose || FacePoseCalculator.calculateEmotionPose(EMOTIONS.NEUTRAL).pose;
            if (!gazePose || !gazePose.pose) {
                return base;
            }

            const g = gazePose.pose;

            return {
                leftEye: {
                    scaleX: base.leftEye?.scaleX ?? 1,
                    scaleY: base.leftEye?.scaleY ?? 1,
                    x: (base.leftEye?.x || 0) + (g.leftEye?.x || 0),
                    y: (base.leftEye?.y || 0) + (g.leftEye?.y || 0),
                    rotation: (base.leftEye?.rotation || 0) + (g.leftEye?.rotation || 0)
                },
                rightEye: {
                    scaleX: base.rightEye?.scaleX ?? 1,
                    scaleY: base.rightEye?.scaleY ?? 1,
                    x: (base.rightEye?.x || 0) + (g.rightEye?.x || 0),
                    y: (base.rightEye?.y || 0) + (g.rightEye?.y || 0),
                    rotation: (base.rightEye?.rotation || 0) + (g.rightEye?.rotation || 0)
                },
                mouth: {
                    scaleX: base.mouth?.scaleX ?? 1,
                    scaleY: base.mouth?.scaleY ?? 1,
                    x: base.mouth?.x || 0,
                    y: base.mouth?.y || 0,
                    rotation: base.mouth?.rotation || 0
                },
                head: {
                    scaleX: 1,
                    scaleY: 1,
                    rotation: (base.head?.rotation || 0) + (g.head?.rotation || 0),
                    x: (base.head?.x || 0) + (g.head?.x || 0),
                    y: (base.head?.y || 0) + (g.head?.y || 0)
                },
                face: {
                    ...base.face
                }
            };
        }
    }

    FacePoseCalculator.EMOTIONS = EMOTIONS;
    FacePoseCalculator.LIMITS = DEFAULT_EMOTION_LIMITS;

    global.FacePoseCalculator = FacePoseCalculator;
    global.EMOTIONS = EMOTIONS;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            FacePoseCalculator,
            EMOTIONS,
            DEFAULT_EMOTION_LIMITS
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
