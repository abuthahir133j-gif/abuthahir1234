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

module.exports = {
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
