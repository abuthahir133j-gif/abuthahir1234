/**
 * Travel AI Buddy — Module Index Entry Point
 */

const { buddyEvents, BuddyEventBus } = require('../../events/buddyEvents');
const buddyConfig = require('./buddy.config');
const BuddyAnimations = require('./BuddyAnimations');
const BuddyScene = require('./BuddyScene');
const BuddyController = require('./BuddyController');
const TravelBuddy = require('./TravelBuddy');

module.exports = {
    TravelBuddy,
    BuddyController,
    BuddyScene,
    BuddyAnimations,
    buddyEvents,
    BuddyEventBus,
    buddyConfig
};
