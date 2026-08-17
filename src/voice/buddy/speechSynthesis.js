/**
 * Travel AI Buddy — Text-to-Speech (TTS) Synthesis Layer
 * 
 * Handles speech audio playback with emotion-aware pitch/rate modulation,
 * interrupt handling, deduplication, and cleanup.
 */
(function (global) {
    const _voiceConfig = (typeof global.voiceConfig !== 'undefined')
        ? global.voiceConfig
        : require('./voiceConfig');

    class BuddySpeechSynthesis {
        constructor(config = {}) {
            this.config = { ..._voiceConfig.synthesis, ...(config.synthesis || {}) };
            this.emotionModulation = { ..._voiceConfig.emotionModulation, ...(config.emotionModulation || {}) };

            this.isSpeakingActive = false;
            this.lastSpokenText = '';
            this.lastSpokenTime = 0;
            this.dedupThresholdMs = 2500;

            this.cachedVoices = [];
            this.initVoices();
        }

        /**
         * Check if SpeechSynthesis is supported
         * @returns {boolean}
         */
        isSupported() {
            if (typeof window === 'undefined') return false;
            return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
        }

        /**
         * Initialize and cache available browser voices
         */
        initVoices() {
            if (!this.isSupported()) return;

            const loadVoices = () => {
                try {
                    this.cachedVoices = window.speechSynthesis.getVoices() || [];
                } catch (e) {
                    this.cachedVoices = [];
                }
            };

            loadVoices();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        /**
         * Get best available voice matching language and child persona
         * @param {string} [lang='en-US']
         * @returns {SpeechSynthesisVoice|null}
         */
        getBestVoice(lang = 'en-US') {
            if (this.cachedVoices.length === 0 && this.isSupported()) {
                this.cachedVoices = window.speechSynthesis.getVoices() || [];
            }

            // 1. Check preferred voice name if specified
            if (this.config.preferredVoiceName) {
                const match = this.cachedVoices.find(v => v.name.toLowerCase().includes(this.config.preferredVoiceName.toLowerCase()));
                if (match) return match;
            }

            // 2. Child Persona: Look for female/child/youthful natural voices (e.g. Zira, Samantha, Jenny, Ivy, Google, Natural)
            const childFriendlyVoice = this.cachedVoices.find(v => {
                const name = v.name.toLowerCase();
                const vLang = v.lang.toLowerCase();
                const isEnglish = vLang.includes('en') || vLang.includes('us') || vLang.includes('gb');
                return isEnglish && (
                    name.includes('child') || name.includes('kid') || name.includes('junior') ||
                    name.includes('zira') || name.includes('samantha') || name.includes('jenny') ||
                    name.includes('ivy') || name.includes('victoria') || name.includes('google us') ||
                    name.includes('natural')
                );
            });
            if (childFriendlyVoice) return childFriendlyVoice;

            // 3. Fallback to any English voice
            const englishVoice = this.cachedVoices.find(v => v.lang.startsWith('en'));
            if (englishVoice) return englishVoice;

            return this.cachedVoices[0] || null;
        }

        /**
         * Update voice persona parameters
         * @param {'child'|'adult'|'robot'} persona 
         */
        setPersona(persona = 'child') {
            if (persona === 'child') {
                this.config.pitch = 1.40;
                this.config.rate = 1.08;
            } else if (persona === 'robot') {
                this.config.pitch = 0.85;
                this.config.rate = 0.95;
            } else {
                this.config.pitch = 1.00;
                this.config.rate = 1.00;
            }
        }

        /**
         * Speak text with emotion-aware voice modulation
         * @param {string} text 
         * @param {string} [emotion='neutral'] 
         * @param {Object} [callbacks] { onStart, onEnd, onError }
         * @returns {boolean} whether speech started
         */
        speak(text, emotion = 'neutral', callbacks = {}) {
            if (!text || !String(text).trim()) return false;

            const cleanText = String(text).trim();

            // 1. Deduplication Protection (Prevent duplicate identical speech within short threshold)
            const now = Date.now();
            if (this.lastSpokenText === cleanText && (now - this.lastSpokenTime < this.dedupThresholdMs)) {
                console.log('[BuddySpeechSynthesis] Skipping duplicate speech playback.');
                if (callbacks.onEnd) callbacks.onEnd();
                return false;
            }

            if (!this.isSupported()) {
                console.log('[BuddySpeechSynthesis] SpeechSynthesis not supported in this environment.');
                // Simulate duration for character animation fallback
                const fallbackDuration = Math.max(2000, cleanText.length * 65);
                if (callbacks.onStart) callbacks.onStart();
                setTimeout(() => {
                    if (callbacks.onEnd) callbacks.onEnd();
                }, fallbackDuration);
                return false;
            }

            // 2. Stop any existing ongoing speech to prevent overlapping
            this.stop();

            try {
                const utterance = new window.SpeechSynthesisUtterance(cleanText);
                const voice = this.getBestVoice(this.config.lang);
                if (voice) {
                    utterance.voice = voice;
                }

                // 3. Apply Emotion Modulation (with Child Voice Pitch Boost)
                const modulation = this.emotionModulation[emotion] || this.emotionModulation.neutral || { rate: 1.0, pitch: 1.0 };
                const calculatedRate = (this.config.rate || 1.08) * (modulation.rate || 1.0);
                const calculatedPitch = (this.config.pitch || 1.40) * (modulation.pitch || 1.0);

                utterance.rate = Math.max(0.5, Math.min(2.0, calculatedRate));
                utterance.pitch = Math.max(0.5, Math.min(2.0, calculatedPitch));
                utterance.volume = this.config.volume ?? 1.0;
                utterance.lang = this.config.lang || 'en-US';

                // 4. Lifecycle Listeners
                utterance.onstart = () => {
                    this.isSpeakingActive = true;
                    this.lastSpokenText = cleanText;
                    this.lastSpokenTime = Date.now();
                    if (callbacks.onStart) callbacks.onStart();
                };

                utterance.onend = () => {
                    this.isSpeakingActive = false;
                    if (callbacks.onEnd) callbacks.onEnd();
                };

                utterance.onerror = (e) => {
                    this.isSpeakingActive = false;
                    console.warn('[BuddySpeechSynthesis] Synthesis error:', e.error || e.message);
                    if (callbacks.onError) callbacks.onError(e);
                    if (callbacks.onEnd) callbacks.onEnd();
                };

                window.speechSynthesis.speak(utterance);
                return true;
            } catch (err) {
                console.warn('[BuddySpeechSynthesis] Exception in speak():', err.message);
                this.isSpeakingActive = false;
                if (callbacks.onError) callbacks.onError(err);
                if (callbacks.onEnd) callbacks.onEnd();
                return false;
            }
        }

        /**
         * Stop all speech immediately
         */
        stop() {
            if (this.isSupported()) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}
            }
            this.isSpeakingActive = false;
        }

        /**
         * Check if currently speaking
         * @returns {boolean}
         */
        isSpeaking() {
            if (!this.isSupported()) return this.isSpeakingActive;
            return Boolean(this.isSpeakingActive || window.speechSynthesis.speaking);
        }

        /**
         * Cleanup
         */
        destroy() {
            this.stop();
            this.cachedVoices = [];
        }
    }

    global.BuddySpeechSynthesis = BuddySpeechSynthesis;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddySpeechSynthesis;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
