/**
 * Travel AI Buddy — Scene & Character Viewport Renderer
 */
(function (global) {
    const _BuddyAnimations = (typeof global.BuddyAnimations !== 'undefined')
        ? global.BuddyAnimations
        : require('./BuddyAnimations');

    const _BuddyRigController = (typeof global.BuddyRigController !== 'undefined')
        ? global.BuddyRigController
        : require('./BuddyRigController');

    const _BuddyAnimationEngine = (typeof global.BuddyAnimationEngine !== 'undefined')
        ? global.BuddyAnimationEngine
        : (typeof require !== 'undefined' ? require('./BuddyAnimationEngine') : null);

    class BuddyScene {
        constructor(containerElement, config = {}, animationManager = null) {
            this.container = containerElement || document.body;
            this.config = config;
            this.animationManager = animationManager || new _BuddyAnimations(config);
            this.rig = new _BuddyRigController(this);
            this.animationEngine = _BuddyAnimationEngine ? new _BuddyAnimationEngine(this.rig) : null;
            this.anim = this.animationEngine;

            this.rootElement = null;
            this.characterElement = null;
            this.svgElement = null;
            this.faceGroup = null;
            this.leftArm = null;
            this.rightArm = null;
            this.head = null;
            this.body = null;
            this.speechBubble = null;
            this.fxContainer = null;
            this.speechTimeout = null;

            this.isLoaded = false;
        }

        async mount() {
            this.createRootLayout();
            await this.loadCharacterSvg();
            this.bindInteractions();
            this.isLoaded = true;
            console.log('[TravelBuddy] Scene mounted successfully with Rig Controller.');
        }

        createRootLayout() {
            if (document.getElementById('travel-buddy-root')) {
                document.getElementById('travel-buddy-root').remove();
            }

            const placement = this.config.placement || {
                position: 'bottom-right',
                offsetX: 24,
                offsetY: 24,
                scale: 1.0,
                zIndex: 9999
            };

            const root = document.createElement('div');
            root.id = 'travel-buddy-root';
            root.className = `travel-buddy-container pos-${placement.position || 'bottom-right'}`;
            root.style.zIndex = placement.zIndex || 9999;
            root.style.transform = `scale(${placement.scale || 1})`;

            // Speech Bubble
            const speech = document.createElement('div');
            speech.className = 'buddy-speech-bubble hidden';
            speech.innerHTML = '<span class="buddy-speech-text"></span><div class="buddy-speech-arrow"></div>';
            root.appendChild(speech);
            this.speechBubble = speech;

            // Particle FX Container
            const fx = document.createElement('div');
            fx.className = 'buddy-fx-container';
            root.appendChild(fx);
            this.fxContainer = fx;

            // Character Container
            const charContainer = document.createElement('div');
            charContainer.className = 'buddy-character-wrap anim-idle';
            charContainer.setAttribute('tabindex', '0');
            charContainer.setAttribute('role', 'button');
            charContainer.setAttribute('aria-label', 'Travel AI Buddy');
            root.appendChild(charContainer);
            this.characterElement = charContainer;

            // Floating Mic Button
            const micBtn = document.createElement('button');
            micBtn.id = 'buddy-mic-trigger';
            micBtn.className = 'buddy-mic-btn';
            micBtn.title = 'Talk to Travel Buddy (Microphone)';
            micBtn.innerHTML = '<span class="mic-icon">🎤</span><span class="mic-wave"></span>';
            root.appendChild(micBtn);
            this.micButton = micBtn;

            // Status Indicator Pill
            const badge = document.createElement('div');
            badge.className = 'buddy-status-badge';
            badge.innerHTML = '<span class="status-dot"></span><span class="status-label" id="buddy-status-text">Travel Buddy</span>';
            root.appendChild(badge);
            this.statusBadge = badge;

            this.container.appendChild(root);
            this.rootElement = root;
        }

        async loadCharacterSvg() {
            const svgPath = this.config.character?.asset || this.config.asset?.path || 'AI/png.svg';
            try {
                const response = await fetch(svgPath);
                if (!response.ok) {
                    throw new Error(`Buddy asset not found: ${svgPath}`);
                }
                const svgContent = await response.text();
                this.characterElement.innerHTML = svgContent;

                this.svgElement = this.characterElement.querySelector('svg');
                if (this.svgElement) {
                    this.svgElement.setAttribute('class', 'buddy-svg-canvas');
                    this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    
                    this.faceGroup = this.svgElement.querySelector('#buddy-face-features') || this.svgElement.querySelector('#face-features');
                    this.leftArm = this.svgElement.querySelector('#buddy-left-arm') || this.svgElement.querySelector('#left-arm');
                    this.rightArm = this.svgElement.querySelector('#buddy-right-arm') || this.svgElement.querySelector('#right-arm');
                    this.head = this.svgElement.querySelector('#buddy-head') || this.svgElement.querySelector('#head');
                    this.body = this.svgElement.querySelector('#buddy-body') || this.svgElement.querySelector('#body');

                    if (this.rig) {
                        this.rig.attachSvg(this.svgElement);
                    }
                }
            } catch (err) {
                console.error(`[TravelBuddy] ${err.message}`);
                this.characterElement.innerHTML = `
                    <div style="background: rgba(220, 38, 38, 0.9); color: #fff; padding: 10px; border-radius: 8px; font-size: 11px; text-align: center; border: 1px solid #f87171;">
                        ⚠️ <strong>Buddy asset not found: ${svgPath}</strong>
                    </div>
                `;
            }
        }

        bindInteractions() {
            if (!this.characterElement) return;

            this.characterElement.addEventListener('click', () => {
                if (global.travelBuddy) {
                    if (typeof global.travelBuddy.play === 'function') {
                        global.travelBuddy.play('wave', 2000);
                    } else if (typeof global.travelBuddy.playGesture === 'function') {
                        global.travelBuddy.playGesture('wave', 2000);
                    }

                    const message = "What can I do for you today?";
                    if (global.momoSpeech && typeof global.momoSpeech.say === 'function') {
                        global.momoSpeech.say(message, { emotion: 'happy', duration: 3200 });
                    } else if (typeof global.travelBuddy.say === 'function') {
                        global.travelBuddy.say(message, 3200);
                    }
                }
            });
        }

        applyState(animationName, emotionName) {
            if (!this.characterElement) return;

            const allAnimations = this.animationManager.getAvailableAnimations();
            for (const anim of allAnimations) {
                this.characterElement.classList.remove(`anim-${anim}`);
            }
            this.characterElement.classList.remove('anim-speaking');

            this.characterElement.classList.add(`anim-${animationName}`);
            this.updateFacialExpression(emotionName);

            if (animationName === 'celebrate') {
                this.spawnConfettiParticles();
            } else if (animationName === 'excited') {
                this.spawnSparkleParticles();
            }
        }

        updateFacialExpression(emotion) {
            // Apply facial reaction within the locked AI/png.svg character
            if (!this.rig) return;

            switch (emotion) {
                case 'happy':
                    this.rig.setTransform('leftEye', { scaleX: 1, scaleY: 0.7, y: -2 });
                    this.rig.setTransform('rightEye', { scaleX: 1, scaleY: 0.7, y: -2 });
                    this.rig.setTransform('mouth', { scaleX: 1.1, scaleY: 1.1, y: -1 });
                    break;
                case 'surprised':
                    this.rig.setTransform('leftEye', { scaleX: 1.25, scaleY: 1.25, y: -3 });
                    this.rig.setTransform('rightEye', { scaleX: 1.25, scaleY: 1.25, y: -3 });
                    this.rig.setTransform('mouth', { scaleX: 0.9, scaleY: 1.3, y: 3 });
                    break;
                case 'thinking':
                    this.rig.setTransform('leftEye', { scaleX: 0.9, scaleY: 0.9, x: -6, y: -5 });
                    this.rig.setTransform('rightEye', { scaleX: 1.1, scaleY: 1.1, x: -4, y: -5 });
                    this.rig.setTransform('mouth', { scaleX: 0.9, scaleY: 0.9, x: -3 });
                    break;
                case 'excited':
                    this.rig.setTransform('leftEye', { scaleX: 1.2, scaleY: 1.2, y: -4 });
                    this.rig.setTransform('rightEye', { scaleX: 1.2, scaleY: 1.2, y: -4 });
                    this.rig.setTransform('mouth', { scaleX: 1.2, scaleY: 1.2, y: 0 });
                    break;
                case 'sad':
                case 'worried':
                    this.rig.setTransform('leftEye', { scaleX: 0.9, scaleY: 0.8, y: 4 });
                    this.rig.setTransform('rightEye', { scaleX: 0.9, scaleY: 0.8, y: 4 });
                    this.rig.setTransform('mouth', { scaleX: 0.8, scaleY: 0.8, y: 5 });
                    break;
                default: // neutral
                    this.rig.resetPart('leftEye');
                    this.rig.resetPart('rightEye');
                    this.rig.resetPart('mouth');
                    break;
            }
        }

        showSpeech(text, duration = 3000) {
            if (!this.speechBubble || !text) return;

            if (this.speechTimeout) {
                clearTimeout(this.speechTimeout);
                this.speechTimeout = null;
            }

            const textSpan = this.speechBubble.querySelector('.buddy-speech-text');
            if (textSpan) {
                textSpan.textContent = text;
            }

            this.speechBubble.classList.remove('hidden');
            this.speechBubble.classList.add('visible');
            this.characterElement.classList.add('anim-speaking');

            if (duration > 0) {
                this.speechTimeout = setTimeout(() => {
                    this.hideSpeech();
                }, duration);
            }
        }

        hideSpeech() {
            if (!this.speechBubble) return;
            this.speechBubble.classList.remove('visible');
            this.speechBubble.classList.add('hidden');
            if (this.characterElement) {
                this.characterElement.classList.remove('anim-speaking');
            }
        }

        setSpeaking(isSpeaking) {
            if (!this.characterElement) return;
            if (isSpeaking) {
                this.characterElement.classList.add('anim-speaking');
            } else {
                this.characterElement.classList.remove('anim-speaking');
            }
        }

        setVoiceVisualState(voiceState) {
            if (!this.micButton) return;

            const iconSpan = this.micButton.querySelector('.mic-icon');
            const statusText = this.statusBadge?.querySelector('#buddy-status-text');

            this.micButton.className = `buddy-mic-btn state-${voiceState}`;

            switch (voiceState) {
                case 'listening':
                    if (iconSpan) iconSpan.textContent = '🔴';
                    if (statusText) statusText.textContent = 'Listening...';
                    break;
                case 'processing':
                    if (iconSpan) iconSpan.textContent = '🤔';
                    if (statusText) statusText.textContent = 'Thinking...';
                    break;
                case 'speaking':
                    if (iconSpan) iconSpan.textContent = '🔊';
                    if (statusText) statusText.textContent = 'Speaking...';
                    break;
                case 'error':
                    if (iconSpan) iconSpan.textContent = '⚠️';
                    if (statusText) statusText.textContent = 'Voice Error';
                    break;
                default: // idle
                    if (iconSpan) iconSpan.textContent = '🎤';
                    if (statusText) statusText.textContent = 'Travel Buddy';
                    break;
            }
        }

        spawnConfettiParticles() {
            if (!this.fxContainer) return;
            this.fxContainer.innerHTML = '';

            const colors = ['#38C8F7', '#FFDF00', '#FF4E78', '#A259FF', '#00F298', '#FFFFFF'];
            for (let i = 0; i < 24; i++) {
                const particle = document.createElement('div');
                particle.className = 'buddy-particle confetti';
                particle.style.backgroundColor = colors[i % colors.length];
                particle.style.left = `${50 + (Math.random() * 60 - 30)}%`;
                particle.style.top = `${40 + (Math.random() * 20 - 10)}%`;
                particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
                particle.style.setProperty('--dy', `${-Math.random() * 160 - 40}px`);
                particle.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
                this.fxContainer.appendChild(particle);
            }

            setTimeout(() => {
                if (this.fxContainer) this.fxContainer.innerHTML = '';
            }, 1800);
        }

        spawnSparkleParticles() {
            if (!this.fxContainer) return;
            this.fxContainer.innerHTML = '';

            const icons = ['✨', '⭐', '💫', '✦'];
            for (let i = 0; i < 10; i++) {
                const particle = document.createElement('div');
                particle.className = 'buddy-particle sparkle';
                particle.textContent = icons[i % icons.length];
                particle.style.left = `${30 + Math.random() * 50}%`;
                particle.style.top = `${20 + Math.random() * 50}%`;
                particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
                particle.style.setProperty('--dy', `${(Math.random() - 0.5) * 120}px`);
                this.fxContainer.appendChild(particle);
            }

            setTimeout(() => {
                if (this.fxContainer) this.fxContainer.innerHTML = '';
            }, 1400);
        }

        setVisible(visible) {
            if (!this.rootElement) return;
            if (visible) {
                this.rootElement.classList.remove('buddy-hidden');
                this.rootElement.classList.add('buddy-visible');
            } else {
                this.rootElement.classList.remove('buddy-visible');
                this.rootElement.classList.add('buddy-hidden');
                this.hideSpeech();
            }
        }

        destroy() {
            if (this.speechTimeout) {
                clearTimeout(this.speechTimeout);
                this.speechTimeout = null;
            }
            if (this.rootElement) {
                this.rootElement.remove();
                this.rootElement = null;
            }
            this.isLoaded = false;
        }
    }

    global.BuddyScene = BuddyScene;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyScene;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
