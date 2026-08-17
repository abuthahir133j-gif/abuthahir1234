/**
 * Travel AI Buddy — Scene & Character Viewport Renderer
 */
(function (global) {
    const _BuddyAnimations = (typeof global.BuddyAnimations !== 'undefined')
        ? global.BuddyAnimations
        : require('./BuddyAnimations');

    class BuddyScene {
        constructor(containerElement, config = {}, animationManager = null) {
            this.container = containerElement || document.body;
            this.config = config;
            this.animationManager = animationManager || new _BuddyAnimations(config);

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
            console.log('[TravelBuddy] Scene mounted successfully.');
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
            const svgPath = this.config.asset?.path || 'AI/idle.svg';
            try {
                const response = await fetch(svgPath);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} loading ${svgPath}`);
                }
                const svgContent = await response.text();
                this.characterElement.innerHTML = svgContent;

                this.svgElement = this.characterElement.querySelector('svg');
                if (this.svgElement) {
                    this.svgElement.setAttribute('class', 'buddy-svg-canvas');
                    this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    
                    this.faceGroup = this.svgElement.querySelector('#face-features');
                    this.leftArm = this.svgElement.querySelector('#left-arm');
                    this.rightArm = this.svgElement.querySelector('#right-arm');
                    this.head = this.svgElement.querySelector('#head');
                    this.body = this.svgElement.querySelector('#body');
                }
            } catch (err) {
                console.warn('[TravelBuddy] Failed to load character model from path, using embedded fallback:', err.message);
                this.renderEmbeddedFallback();
            }
        }

        renderEmbeddedFallback() {
            this.characterElement.innerHTML = `
                <svg class="buddy-svg-canvas" viewBox="0 0 600 600" width="100%" height="100%">
                  <defs>
                    <linearGradient id="headBodyGloss" x1="25%" y1="0%" x2="75%" y2="100%">
                      <stop offset="0%" stop-color="#FFFFFF"/>
                      <stop offset="100%" stop-color="#C7D1E3"/>
                    </linearGradient>
                    <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#9EFAFF"/>
                      <stop offset="100%" stop-color="#00ADEE"/>
                    </linearGradient>
                  </defs>
                  <ellipse cx="300" cy="542" rx="85" ry="11" fill="#C5CEE0" opacity="0.4"/>
                  <g id="robot" transform="translate(0, 10)">
                    <g id="left-arm"><path d="M 235 295 C 190 325 180 415 212 445 C 235 465 260 445 265 390 C 270 340 255 290 235 295 Z" fill="url(#headBodyGloss)"/></g>
                    <g id="right-arm"><path d="M 365 295 C 410 325 420 415 388 445 C 365 465 340 445 335 390 C 330 340 345 290 365 295 Z" fill="url(#headBodyGloss)"/></g>
                    <g id="body"><path d="M 300 260 C 365 260 380 330 375 405 C 370 460 345 485 300 485 C 255 485 230 460 225 405 C 220 330 235 260 300 260 Z" fill="url(#headBodyGloss)"/></g>
                    <g id="head">
                      <path d="M 300 96 C 385 96 405 130 405 178 C 405 230 375 260 300 260 C 225 260 195 230 195 178 C 195 130 215 96 300 96 Z" fill="url(#headBodyGloss)"/>
                      <rect x="224" y="128" width="152" height="100" rx="50" fill="#071322"/>
                      <g id="face-features">
                        <path d="M 252 176 L 284 176 A 16 15 0 0 0 252 176 Z" fill="url(#cyanGlowGrad)"/>
                        <path d="M 316 176 L 348 176 A 16 15 0 0 0 316 176 Z" fill="url(#cyanGlowGrad)"/>
                        <path d="M 292 186 C 292 196 308 196 308 186 Z" fill="url(#cyanGlowGrad)"/>
                      </g>
                    </g>
                  </g>
                </svg>
            `;
            this.svgElement = this.characterElement.querySelector('svg');
            this.faceGroup = this.svgElement?.querySelector('#face-features');
            this.leftArm = this.svgElement?.querySelector('#left-arm');
            this.rightArm = this.svgElement?.querySelector('#right-arm');
            this.head = this.svgElement?.querySelector('#head');
            this.body = this.svgElement?.querySelector('#body');
        }

        bindInteractions() {
            if (!this.characterElement) return;

            this.characterElement.addEventListener('click', () => {
                if (global.travelBuddy) {
                    if (typeof global.travelBuddy.play === 'function') {
                        global.travelBuddy.play('wave');
                    } else if (typeof global.travelBuddy.playGesture === 'function') {
                        global.travelBuddy.playGesture('wave');
                    }

                    if (typeof global.travelBuddy.say === 'function') {
                        global.travelBuddy.say('Hi there! Ready for an adventure? 🌍', 2500);
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
            if (!this.faceGroup) {
                this.faceGroup = this.svgElement?.querySelector('#face-features');
            }
            if (!this.faceGroup) return;

            const preset = this.animationManager.getFaceFeatures(emotion);
            if (preset) {
                this.faceGroup.innerHTML = `${preset.leftEye}\n${preset.rightEye}\n${preset.mouth}`;
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
