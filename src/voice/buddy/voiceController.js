/**
 * Travel AI Buddy — Step 3: Voice Controller
 * 
 * Orchestrates Speech-to-Text, AI Brain processing, Text-to-Speech playback,
 * interrupts, and synchronization with the Buddy Character Controller.
 */
(function (global) {
    const _voiceConfig = (typeof global.voiceConfig !== 'undefined')
        ? global.voiceConfig
        : require('./voiceConfig');

    const _BuddySpeechRecognition = (typeof global.BuddySpeechRecognition !== 'undefined')
        ? global.BuddySpeechRecognition
        : require('./speechRecognition');

    const _BuddySpeechSynthesis = (typeof global.BuddySpeechSynthesis !== 'undefined')
        ? global.BuddySpeechSynthesis
        : require('./speechSynthesis');

    class BuddyVoiceController {
        constructor(buddyController = null, buddyAI = null, config = {}) {
            this.buddyController = buddyController;
            this.buddyAI = buddyAI;
            this.config = { ..._voiceConfig, ...config };

            this.recognition = new _BuddySpeechRecognition(this.config);
            this.synthesis = new _BuddySpeechSynthesis(this.config);

            // Voice State Machine: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
            this.voiceState = this.config.states.IDLE;
            this.lastTranscript = '';
            this.lastError = null;

            this.stateListeners = new Set();
            this.transcriptListeners = new Set();

            this.bindEngines();
        }

        /**
         * Connect engines and lifecycle hooks
         */
        bindEngines() {
            // STT Transcript Received
            this.recognition.onTranscript((transcript, isFinal) => {
                this.lastTranscript = transcript;
                this.notifyTranscript(transcript, isFinal);

                if (isFinal && transcript.trim()) {
                    this.handleUserSpoke(transcript.trim());
                }
            });

            // STT Error
            this.recognition.onError((errorMsg, errorType) => {
                this.lastError = errorMsg;
                this.setVoiceState(this.config.states.ERROR);

                if (this.buddyController) {
                    this.buddyController.setEmotion('confused');
                    this.buddyController.play('surprised');
                    this.buddyController.say(errorMsg, 3500);
                }

                // Return to idle after error
                setTimeout(() => {
                    if (this.voiceState === this.config.states.ERROR) {
                        this.setVoiceState(this.config.states.IDLE);
                    }
                }, 3500);
            });
        }

        /**
         * Set Buddy Controller reference
         * @param {Object} controller 
         */
        setBuddyController(controller) {
            this.buddyController = controller;
        }

        /**
         * Set AI Brain reference
         * @param {Object} ai 
         */
        setBuddyAI(ai) {
            this.buddyAI = ai;
        }

        /**
         * Get current voice state
         * @returns {string}
         */
        getState() {
            return this.voiceState;
        }

        /**
         * Set voice state and notify subscribers
         * @param {string} newState 
         */
        setVoiceState(newState) {
            this.voiceState = newState;
            for (const listener of this.stateListeners) {
                try {
                    listener(newState);
                } catch (e) {
                    console.error('[BuddyVoiceController] Error in state listener:', e);
                }
            }
        }

        /**
         * Subscribe to voice state changes
         * @param {Function} listener (state: string) => void
         * @returns {Function} unsubscribe
         */
        onStateChange(listener) {
            this.stateListeners.add(listener);
            listener(this.voiceState);
            return () => this.stateListeners.delete(listener);
        }

        /**
         * Subscribe to live transcript updates
         * @param {Function} listener (transcript: string, isFinal: boolean) => void
         * @returns {Function} unsubscribe
         */
        onTranscript(listener) {
            this.transcriptListeners.add(listener);
            return () => this.transcriptListeners.delete(listener);
        }

        notifyTranscript(transcript, isFinal) {
            for (const listener of this.transcriptListeners) {
                try {
                    listener(transcript, isFinal);
                } catch (e) {}
            }
        }

        /**
         * Check if browser supports voice features
         * @returns {{ stt: boolean, tts: boolean }}
         */
        isSupported() {
            return {
                stt: this.recognition.isSupported(),
                tts: this.synthesis.isSupported()
            };
        }

        /**
         * Start speech recognition listening
         */
        startListening() {
            // 1. Interrupt any current speaking session
            if (this.voiceState === this.config.states.SPEAKING || this.synthesis.isSpeaking()) {
                this.stopSpeaking();
            }

            // 2. Set State to LISTENING
            this.setVoiceState(this.config.states.LISTENING);

            // 3. Buddy Visual Reaction
            if (this.buddyController) {
                this.buddyController.setEmotion('curious');
                this.buddyController.play('idle');
                this.buddyController.say('Listening... 🎙️', 0); // Open status
            }

            // 4. Start Recognition
            const started = this.recognition.start();
            if (!started) {
                this.setVoiceState(this.config.states.ERROR);
            }
        }

        /**
         * Stop listening manually
         */
        stopListening() {
            this.recognition.stop();
            if (this.voiceState === this.config.states.LISTENING) {
                this.setVoiceState(this.config.states.IDLE);
                if (this.buddyController) {
                    this.buddyController.returnToIdle();
                }
            }
        }

        /**
         * Toggle microphone listening
         */
        toggleListening() {
            if (this.voiceState === this.config.states.LISTENING) {
                this.stopListening();
            } else {
                this.startListening();
            }
        }

        /**
         * Process user transcript through the existing Step 2 AI Brain
         * @param {string} userTranscript 
         */
        async handleUserSpoke(userTranscript) {
            console.log(`[BuddyVoiceController] Processing user speech: "${userTranscript}"`);

            // 1. Stop active recognition
            this.recognition.stop();

            // 2. Set State to PROCESSING
            this.setVoiceState(this.config.states.PROCESSING);

            // 3. Buddy Visual Reaction
            if (this.buddyController) {
                this.buddyController.setEmotion('thinking');
                this.buddyController.play('thinking');
                this.buddyController.say(`"${userTranscript}" 🤔`, 1500);
            }

            // 4. Send to Existing AI Brain
            let decision = null;
            if (this.buddyAI) {
                decision = await this.buddyAI.askBuddy(userTranscript);
            } else {
                decision = {
                    message: `You asked: "${userTranscript}". Ready to explore! ✈️`,
                    emotion: 'happy',
                    animation: 'happy'
                };
            }

            // 5. Speak AI Decision Response via TTS
            if (decision && decision.message) {
                this.speakDecision(decision);
            } else {
                this.setVoiceState(this.config.states.IDLE);
            }
        }

        /**
         * Speak a structured Buddy decision with synchronized character speaking animation
         * @param {Object} decision { message, emotion, animation, duration }
         */
        speakDecision(decision) {
            const { message, emotion = 'happy', animation = 'happy' } = decision;

            // 1. Set State to SPEAKING
            this.setVoiceState(this.config.states.SPEAKING);

            // 2. Buddy Visual Emotion & Gesture
            if (this.buddyController) {
                this.buddyController.setEmotion(emotion);
                this.buddyController.play(animation);
                this.buddyController.setSpeaking(true);
                this.buddyController.say(message, decision.duration || 4000);
            }

            // 3. Trigger Speech Synthesis (TTS)
            this.synthesis.speak(message, emotion, {
                onStart: () => {
                    this.setVoiceState(this.config.states.SPEAKING);
                    if (this.buddyController) {
                        this.buddyController.setSpeaking(true);
                    }
                },
                onEnd: () => {
                    this.setVoiceState(this.config.states.IDLE);
                    if (this.buddyController) {
                        this.buddyController.setSpeaking(false);
                        this.buddyController.returnToIdle();
                    }
                },
                onError: () => {
                    this.setVoiceState(this.config.states.IDLE);
                    if (this.buddyController) {
                        this.buddyController.setSpeaking(false);
                        this.buddyController.returnToIdle();
                    }
                }
            });
        }

        /**
         * Stop speech synthesis playback immediately
         */
        stopSpeaking() {
            this.synthesis.stop();
            if (this.buddyController) {
                this.buddyController.setSpeaking(false);
            }
            if (this.voiceState === this.config.states.SPEAKING) {
                this.setVoiceState(this.config.states.IDLE);
            }
        }

        /**
         * Test TTS directly without speech recognition
         * @param {string} [text] 
         * @param {string} [emotion='happy'] 
         */
        testTTS(text = 'Welcome to your travel adventure! Where should we explore next? ✈️', emotion = 'happy') {
            this.speakDecision({
                message: text,
                emotion: emotion,
                animation: 'happy',
                duration: 4000
            });
        }

        /**
         * Cleanup
         */
        destroy() {
            this.stopListening();
            this.stopSpeaking();
            this.recognition.destroy();
            this.synthesis.destroy();
            this.stateListeners.clear();
            this.transcriptListeners.clear();
        }
    }

    global.BuddyVoiceController = BuddyVoiceController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyVoiceController;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
