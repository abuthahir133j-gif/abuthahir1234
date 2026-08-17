/**
 * Travel AI Buddy — AI Brain Module Exports
 */

const { buddyContext, BuddyContext } = require('./buddyContext');
const { weatherAdapter, WeatherAdapter } = require('./weatherAdapter');
const { buddyObserver, BuddyObservationEngine, OBSERVATION_TYPES } = require('./buddyObserver');
const { BUDDY_SYSTEM_PROMPT, buildAIInput, buildUserQuestionInput } = require('./buddyPrompt');
const {
    ALLOWED_EMOTIONS,
    ALLOWED_ANIMATIONS,
    validateAIResponse,
    createFallbackDecision,
    parseRawAIOutput
} = require('./buddyResponse');
const { EVENT_PRIORITY, BuddyDecisionEngine, buddyDecision } = require('./buddyDecision');
const { BuddyAI, buddyAI } = require('./buddyAI');

module.exports = {
    BuddyAI,
    buddyAI,
    buddyContext,
    BuddyContext,
    weatherAdapter,
    WeatherAdapter,
    buddyObserver,
    BuddyObservationEngine,
    OBSERVATION_TYPES,
    buddyDecision,
    BuddyDecisionEngine,
    EVENT_PRIORITY,
    BUDDY_SYSTEM_PROMPT,
    buildAIInput,
    buildUserQuestionInput,
    ALLOWED_EMOTIONS,
    ALLOWED_ANIMATIONS,
    validateAIResponse,
    createFallbackDecision,
    parseRawAIOutput
};
