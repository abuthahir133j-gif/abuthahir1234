/**
 * Travel AI Buddy — Speech Recognition (STT) Layer
 * 
 * Safely wraps browser SpeechRecognition / webkitSpeechRecognition API
 * with error handling, silence timeouts, and permission recovery.
 */
(function (global) {
    const _voiceConfig = (typeof global.voiceConfig !== 'undefined')
        ? global.voiceConfig
        : require('./voiceConfig');

    class BuddySpeechRecognition {
        constructor(config = {}) {
            this.config = { ..._voiceConfig.recognition, ...(config.recognition || {}) };
            this.recognitionInstance = null;
            this.isListeningActive = false;
            this.silenceTimer = null;

            this.onTranscriptCallback = null;
            this.onErrorCallback = null;
            this.onStateChangeCallback = null;

            this.initEngine();
        }

        /**
         * Check if SpeechRecognition is supported in current environment
         * @returns {boolean}
         */
        isSupported() {
            if (typeof window === 'undefined') return false;
            return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
        }

        /**
         * Initialize speech recognition engine
         */
        initEngine() {
            if (!this.isSupported()) {
                console.log('[BuddySpeechRecognition] Browser SpeechRecognition not supported in this environment.');
                return;
            }

            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognitionInstance = new SpeechRecognition();
                this.recognitionInstance.lang = this.config.lang || 'en-US';
                this.recognitionInstance.continuous = this.config.continuous ?? false;
                this.recognitionInstance.interimResults = this.config.interimResults ?? true;
                this.recognitionInstance.maxAlternatives = this.config.maxAlternatives ?? 1;

                this.bindEvents();
            } catch (err) {
                console.warn('[BuddySpeechRecognition] Initialization notice:', err.message);
                this.recognitionInstance = null;
            }
        }

        /**
         * Bind recognition lifecycle events
         */
        bindEvents() {
            if (!this.recognitionInstance) return;

            this.recognitionInstance.onstart = () => {
                this.isListeningActive = true;
                this.resetSilenceTimer();
                if (this.onStateChangeCallback) this.onStateChangeCallback('listening');
            };

            this.recognitionInstance.onresult = (event) => {
                this.resetSilenceTimer();
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcriptPiece;
                    } else {
                        interimTranscript += transcriptPiece;
                    }
                }

                const resultText = (finalTranscript || interimTranscript).trim();
                const isFinal = Boolean(finalTranscript);

                if (this.onTranscriptCallback && resultText) {
                    this.onTranscriptCallback(resultText, isFinal);
                }
            };

            this.recognitionInstance.onerror = (event) => {
                this.clearSilenceTimer();
                this.isListeningActive = false;

                const errorType = event.error || 'unknown';
                let userFriendlyMessage = 'Speech recognition error occurred.';

                switch (errorType) {
                    case 'not-allowed':
                    case 'service-not-allowed':
                        userFriendlyMessage = 'Microphone permission denied. You can use text input instead.';
                        break;
                    case 'no-speech':
                        userFriendlyMessage = 'No speech detected. Please try speaking again.';
                        break;
                    case 'audio-capture':
                        userFriendlyMessage = 'No microphone device found on your system.';
                        break;
                    case 'network':
                        userFriendlyMessage = 'Speech-to-text requires cloud speech access in this browser. Please type in the ask box below! 💬';
                        break;
                    default:
                        userFriendlyMessage = `Voice recognition error: ${errorType}`;
                        break;
                }

                console.warn(`[BuddySpeechRecognition] Error (${errorType}):`, userFriendlyMessage);
                if (this.onErrorCallback) {
                    this.onErrorCallback(userFriendlyMessage, errorType);
                }
                if (this.onStateChangeCallback) {
                    this.onStateChangeCallback('error');
                }
            };

            this.recognitionInstance.onend = () => {
                this.clearSilenceTimer();
                this.isListeningActive = false;
                if (this.onStateChangeCallback) {
                    this.onStateChangeCallback('idle');
                }
            };
        }

        /**
         * Start speech recognition session
         * @returns {boolean} whether recognition successfully started
         */
        start() {
            if (!this.isSupported() || !this.recognitionInstance) {
                if (this.onErrorCallback) {
                    this.onErrorCallback('Speech recognition is not supported in this browser.', 'not-supported');
                }
                return false;
            }

            if (this.isListeningActive) {
                console.log('[BuddySpeechRecognition] Recognition session already active.');
                return true;
            }

            try {
                this.recognitionInstance.start();
                return true;
            } catch (err) {
                console.warn('[BuddySpeechRecognition] Failed to start recognition:', err.message);
                if (this.onErrorCallback) {
                    this.onErrorCallback(err.message, 'start-failed');
                }
                return false;
            }
        }

        /**
         * Stop listening and finalize results
         */
        stop() {
            this.clearSilenceTimer();
            if (this.recognitionInstance && this.isListeningActive) {
                try {
                    this.recognitionInstance.stop();
                } catch (e) {}
            }
            this.isListeningActive = false;
        }

        /**
         * Abort recognition immediately
         */
        abort() {
            this.clearSilenceTimer();
            if (this.recognitionInstance && this.isListeningActive) {
                try {
                    this.recognitionInstance.abort();
                } catch (e) {}
            }
            this.isListeningActive = false;
        }

        /**
         * Reset auto-silence timer
         */
        resetSilenceTimer() {
            this.clearSilenceTimer();
            const timeout = this.config.autoStopTimeoutMs || 6000;
            this.silenceTimer = setTimeout(() => {
                console.log('[BuddySpeechRecognition] Silence timeout reached, stopping recognition.');
                this.stop();
            }, timeout);
        }

        /**
         * Clear silence timer
         */
        clearSilenceTimer() {
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
        }

        /**
         * Register transcript listener
         * @param {Function} callback (transcript: string, isFinal: boolean) => void
         */
        onTranscript(callback) {
            this.onTranscriptCallback = callback;
        }

        /**
         * Register error listener
         * @param {Function} callback (errorMessage: string, errorType: string) => void
         */
        onError(callback) {
            this.onErrorCallback = callback;
        }

        /**
         * Register state change listener
         * @param {Function} callback (state: string) => void
         */
        onStateChange(callback) {
            this.onStateChangeCallback = callback;
        }

        /**
         * Cleanup all listeners and active instances
         */
        destroy() {
            this.abort();
            this.onTranscriptCallback = null;
            this.onErrorCallback = null;
            this.onStateChangeCallback = null;
            this.recognitionInstance = null;
        }
    }

    global.BuddySpeechRecognition = BuddySpeechRecognition;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddySpeechRecognition;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
