/**
 * Travel AI Buddy — Memory Module Exports
 */

const { MemoryStore, memoryStore } = require('./memoryStore');
const { UserPreferences, userPreferences, DEFAULT_PREFERENCES } = require('./userPreferences');
const { TripMemory, tripMemory } = require('./tripMemory');
const { ConversationMemory, conversationMemory } = require('./conversationMemory');
const { BuddyMemory, buddyMemory } = require('./buddyMemory');

module.exports = {
    MemoryStore,
    memoryStore,
    UserPreferences,
    userPreferences,
    DEFAULT_PREFERENCES,
    TripMemory,
    tripMemory,
    ConversationMemory,
    conversationMemory,
    BuddyMemory,
    buddyMemory
};
