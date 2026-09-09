/**
 * Travel AI Buddy — Voice Configuration
 * 
 * Centralized settings for speech recognition, text-to-speech synthesis,
 * emotion speech modulations, and voice state definitions.
 */
(function (global) {
    const voiceConfig = {
        // Voice State Enum
        states: {
            IDLE: 'idle',
            LISTENING: 'listening',
            PROCESSING: 'processing',
            SPEAKING: 'speaking',
            ERROR: 'error'
        },

        // Speech Recognition Settings (STT)
        recognition: {
            lang: 'en-US',
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            autoStopTimeoutMs: 6000 // auto-stop listening after 6s of silence
        },

        // Speech Synthesis Settings (TTS) — 5-Year-Old Child Voice
        synthesis: {
            lang: 'en-US',
            persona: 'child', // 5-year-old child persona
            age: 5,
            rate: 1.04,       // lively, enthusiastic, clear toddler/child pace
            pitch: 1.55,      // sweet, bright, cheerful 5-year-old child pitch (1.55)
            volume: 1.0,      // standard max browser TTS volume (0.0 to 1.0)
            preferredVoiceName: '' // prioritizes child/kid/youthful natural voices
        },

        // Emotion-Aware Voice Modulation for 5-Year-Old Child
        emotionModulation: {
            excited: { rate: 1.12, pitch: 1.16 }, // bouncy and energetic
            happy: { rate: 1.06, pitch: 1.10 },   // cheerful & warm
            sad: { rate: 0.88, pitch: 0.90 },     // soft, subdued
            worried: { rate: 0.92, pitch: 0.96 }, // gentle, tentative
            surprised: { rate: 1.10, pitch: 1.20 },// playful squeak
            thinking: { rate: 0.96, pitch: 1.04 }, // inquisitive
            curious: { rate: 1.05, pitch: 1.12 }, // curious child wondering
            confused: { rate: 0.92, pitch: 1.08 },
            neutral: { rate: 1.00, pitch: 1.00 }
        },

        // Visual Reactions during voice states
        stateReactions: {
            listening: { emotion: 'curious', animation: 'idle' },
            processing: { emotion: 'thinking', animation: 'thinking' },
            speaking: { animation: 'talking' },
            error: { emotion: 'confused', animation: 'surprised' }
        }
    };

    global.voiceConfig = voiceConfig;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = voiceConfig;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
