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

        // Speech Synthesis Settings (TTS) — Child / Cheerful Companion Voice
        synthesis: {
            lang: 'en-US',
            persona: 'child', // 'child' | 'adult' | 'robot'
            rate: 1.08,       // lively, enthusiastic pace
            pitch: 1.40,      // youthful, sweet, cheerful child pitch
            volume: 1.0,
            preferredVoiceName: '' // matches best available child/female natural voice
        },

        // Emotion-Aware Voice Modulation for Child Persona
        emotionModulation: {
            excited: { rate: 1.15, pitch: 1.20 },
            happy: { rate: 1.08, pitch: 1.10 },
            sad: { rate: 0.88, pitch: 0.88 },
            worried: { rate: 0.94, pitch: 0.95 },
            surprised: { rate: 1.12, pitch: 1.25 },
            thinking: { rate: 0.96, pitch: 1.02 },
            curious: { rate: 1.06, pitch: 1.15 },
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
