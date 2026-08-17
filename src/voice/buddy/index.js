/**
 * Travel AI Buddy — Voice Module Exports
 */

const voiceConfig = require('./voiceConfig');
const BuddySpeechRecognition = require('./speechRecognition');
const BuddySpeechSynthesis = require('./speechSynthesis');
const BuddyVoiceController = require('./voiceController');

module.exports = {
    voiceConfig,
    BuddySpeechRecognition,
    BuddySpeechSynthesis,
    BuddyVoiceController
};
