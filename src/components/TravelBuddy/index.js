/**
 * Travel AI Buddy — Module Index Entry Point
 */

const { buddyEvents, BuddyEventBus } = require('../../events/buddyEvents');
const buddyConfig = require('./buddy.config');
const { buddyCharacterConfig, BUDDY_RIG_CONFIG } = require('./buddyRigConfig');
const BuddyRigController = require('./BuddyRigController');
const BuddyAnimationState = require('./BuddyAnimationState');
const BuddyTimeline = require('./BuddyTimeline');
const BuddyAnimationEngine = require('./BuddyAnimationEngine');
const BuddyAnimations = require('./BuddyAnimations');
const BuddyScene = require('./BuddyScene');
const BuddyController = require('./BuddyController');
const GazeController = require('../../character/buddy/actions/GazeController');
const GazePoseCalculator = require('../../character/buddy/actions/GazePoseCalculator');
const { FacePoseCalculator, EMOTIONS } = require('../../character/buddy/actions/FacePoseCalculator');
const { BuddyFaceController } = require('../../character/buddy/actions/BuddyFaceController');
const PointAction = require('../../character/buddy/actions/PointAction');
const { BuddyReactionConfig, BUDDY_REACTION_CONFIG, REACTION_PRIORITY } = require('../../character/buddy/reactions/BuddyReactionConfig');
const { BuddyEventDetector } = require('../../character/buddy/reactions/BuddyEventDetector');
const { BuddyReactionManager } = require('../../character/buddy/reactions/BuddyReactionManager');
const TravelBuddy = require('./TravelBuddy');

module.exports = {
    TravelBuddy,
    BuddyAnimationEngine,
    BuddyTimeline,
    BuddyAnimationState,
    BuddyRigController,
    buddyCharacterConfig,
    BUDDY_RIG_CONFIG,
    BuddyController,
    BuddyScene,
    BuddyAnimations,
    BuddyFaceController,
    FacePoseCalculator,
    EMOTIONS,
    GazeController,
    GazePoseCalculator,
    PointAction,
    PointPoseCalculator,
    TargetResolver,
    BuddyReactionManager,
    BuddyEventDetector,
    BuddyReactionConfig,
    BUDDY_REACTION_CONFIG,
    REACTION_PRIORITY,
    buddyEvents,
    BuddyEventBus,
    buddyConfig
};
