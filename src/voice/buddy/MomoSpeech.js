/**
 * Momo AI Buddy — Speech Abstraction Layer
 * 
 * Provides a decoupled speech synthesis interface for Momo.
 * Works seamlessly with browser SpeechSynthesis or fallback visual speech bubble.
 */
(function (global) {
    const _BuddySpeechSynthesis = (typeof global.BuddySpeechSynthesis !== 'undefined')
        ? global.BuddySpeechSynthesis
        : (typeof require !== 'undefined' ? require('./speechSynthesis') : null);

    class MomoSpeech {
        constructor(options = {}) {
            this.tts = _BuddySpeechSynthesis ? new _BuddySpeechSynthesis(options) : null;
            this.scene = options.scene || null;
            this.isSpeaking = false;
        }

        setScene(scene) {
            this.scene = scene;
        }

        showVisualBubble(text, duration = 3500) {
            if (this.scene && typeof this.scene.showSpeech === 'function') {
                this.scene.showSpeech(text, duration);
                return;
            }

            if (typeof document !== 'undefined') {
                const bubble = document.querySelector('.buddy-speech-bubble') || document.querySelector('#travel-buddy-root .buddy-speech-bubble');
                if (bubble) {
                    const textSpan = bubble.querySelector('.buddy-speech-text');
                    if (textSpan) {
                        textSpan.textContent = text;
                    } else {
                        bubble.innerHTML = `<span class="buddy-speech-text">${text}</span><div class="buddy-speech-arrow"></div>`;
                    }
                    bubble.classList.remove('hidden');
                    bubble.classList.add('visible');
                    bubble.style.opacity = '1';
                    bubble.style.transform = 'translateY(0) scale(1)';

                    const charWrap = document.querySelector('.buddy-character-wrap');
                    if (charWrap) charWrap.classList.add('anim-speaking');

                    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
                    if (duration > 0) {
                        this.bubbleTimeout = setTimeout(() => {
                            bubble.classList.remove('visible');
                            bubble.classList.add('hidden');
                            bubble.style.opacity = '0';
                            bubble.style.transform = 'translateY(10px) scale(0.9)';
                            if (charWrap) charWrap.classList.remove('anim-speaking');
                        }, duration);
                    }
                }
            }
        }

        /**
         * Speak the given text with child-friendly persona and visual speech bubble
         * @param {string} text Exact text to speak
         * @param {object} [options] { emotion, duration, onStart, onEnd, onError }
         * @returns {Promise<boolean>} Resolves when speech finishes (or on error fallback)
         */
        say(text, options = {}) {
            return new Promise((resolve) => {
                if (!text || !String(text).trim()) {
                    resolve(false);
                    return;
                }

                const cleanText = String(text).trim();
                const emotion = options.emotion || 'happy';
                const visualDuration = options.duration || Math.max(3500, cleanText.length * 85);

                console.log('TTS_STARTED');
                this.isSpeaking = true;

                // Show visual speech bubble prominently above Momo
                this.showVisualBubble(cleanText, visualDuration);

                let completed = false;
                const handleComplete = () => {
                    if (completed) return;
                    completed = true;
                    this.isSpeaking = false;
                    console.log('TTS_COMPLETED');
                    if (options.onEnd) options.onEnd();
                    resolve(true);
                };

                const handleError = (err) => {
                    if (completed) return;
                    completed = true;
                    this.isSpeaking = false;
                    console.warn('TTS ERROR:', err?.message || err);
                    if (options.onError) options.onError(err);
                    // On TTS error, resolve safely so animation sequence continues
                    resolve(false);
                };

                try {
                    // Check if native window.speechSynthesis or BuddySpeechSynthesis is available
                    if (typeof window !== 'undefined' && window.speechSynthesis && window.SpeechSynthesisUtterance) {
                        try {
                            window.speechSynthesis.cancel();
                        } catch (e) {}

                        const utterance = new window.SpeechSynthesisUtterance(cleanText);
                        utterance.rate = 1.05;
                        utterance.pitch = 1.35;
                        utterance.lang = 'en-US';

                        // Best voice selection (child / youthful / en-US)
                        const voices = window.speechSynthesis.getVoices() || [];
                        const friendlyVoice = voices.find(v => {
                            const n = v.name.toLowerCase();
                            return (v.lang.startsWith('en') || v.lang.includes('US')) &&
                                (n.includes('child') || n.includes('zira') || n.includes('samantha') ||
                                 n.includes('jenny') || n.includes('natural') || n.includes('google'));
                        });
                        if (friendlyVoice) {
                            utterance.voice = friendlyVoice;
                        }

                        utterance.onstart = () => {
                            if (options.onStart) options.onStart();
                        };

                        utterance.onend = () => {
                            handleComplete();
                        };

                        utterance.onerror = (e) => {
                            handleError(e);
                        };

                        // Safety timeout in case utterance doesn't trigger onend in some Electron environments
                        const safetyTimeout = setTimeout(() => {
                            handleComplete();
                        }, visualDuration + 1500);

                        const origOnEnd = utterance.onend;
                        utterance.onend = () => {
                            clearTimeout(safetyTimeout);
                            origOnEnd();
                        };

                        window.speechSynthesis.speak(utterance);
                    } else if (this.tts && typeof this.tts.speak === 'function') {
                        const started = this.tts.speak(cleanText, emotion, {
                            onStart: options.onStart,
                            onEnd: handleComplete,
                            onError: handleError
                        });
                        if (!started) {
                            setTimeout(handleComplete, visualDuration);
                        }
                    } else {
                        // Headless / non-browser fallback (e.g. unit tests)
                        if (options.onStart) options.onStart();
                        setTimeout(handleComplete, Math.min(visualDuration, 200));
                    }
                } catch (err) {
                    handleError(err);
                }
            });
        }

        stop() {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}
            }
            if (this.tts && typeof this.tts.stop === 'function') {
                this.tts.stop();
            }
            this.isSpeaking = false;
        }
    }

    const momoSpeech = new MomoSpeech();

    global.MomoSpeech = MomoSpeech;
    global.momoSpeech = momoSpeech;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MomoSpeech, momoSpeech };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
