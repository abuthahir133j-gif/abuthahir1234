/**
 * Travel AI Buddy — Character Behavior Module Exports
 */

const { BuddyAttention, buddyAttention, ATTENTION_TARGETS, ATTENTION_PRIORITY } = require('./BuddyAttention');
const { BuddyExpressionController, buddyExpression } = require('./BuddyExpressionController');
const { BuddyEmotionEngine, buddyEmotion, EMOTION_STATES } = require('./BuddyEmotionEngine');
const { BuddyGestureController, buddyGesture, GESTURES, INTENT_TO_GESTURE } = require('./BuddyGestureController');
const { BuddyIdleController, buddyIdle } = require('./BuddyIdleController');
const { BuddyActionSequencer, buddyActionSequencer } = require('./BuddyActionSequencer');
const { BuddyBehaviorEngine, buddyBehavior } = require('./BuddyBehaviorEngine');

const TargetResolver = require('./actions/TargetResolver');
const PointPoseCalculator = require('./actions/PointPoseCalculator');
const PointAction = require('./actions/PointAction');
const GazePoseCalculator = require('./actions/GazePoseCalculator');
const GazeController = require('./actions/GazeController');
const { FacePoseCalculator, EMOTIONS } = require('./actions/FacePoseCalculator');
const { BuddyFaceController } = require('./actions/BuddyFaceController');
const { BuddyReactionConfig, BUDDY_REACTION_CONFIG, REACTION_PRIORITY } = require('./reactions/BuddyReactionConfig');
const { BuddyEventDetector } = require('./reactions/BuddyEventDetector');
const { BuddyReactionManager } = require('./reactions/BuddyReactionManager');

const GreetingAction = require('./actions/GreetingAction');
const { MomoController, momoController, MOMO_STATES } = require('./MomoController');

module.exports = {
    TargetResolver,
    PointPoseCalculator,
    PointAction,
    GazePoseCalculator,
    GazeController,
    FacePoseCalculator,
    BuddyFaceController,
    EMOTIONS,
    GreetingAction,
    MomoController,
    momoController,
    MOMO_STATES,
    BuddyReactionConfig,
    BUDDY_REACTION_CONFIG,
    REACTION_PRIORITY,
    BuddyEventDetector,
    BuddyReactionManager,
    BuddyAttention,
    buddyAttention,
    ATTENTION_TARGETS,
    ATTENTION_PRIORITY,
    BuddyExpressionController,
    buddyExpression,
    BuddyEmotionEngine,
    buddyEmotion,
    EMOTION_STATES,
    BuddyGestureController,
    buddyGesture,
    GESTURES,
    INTENT_TO_GESTURE,
    BuddyIdleController,
    buddyIdle,
    BuddyActionSequencer,
    buddyActionSequencer,
    BuddyBehaviorEngine,
    buddyBehavior
};

