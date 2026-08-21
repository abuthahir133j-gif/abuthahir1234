/**
 * Travel AI Buddy — Step 6: Browser Event Detector
 * 
 * Efficiently detects real-time application and user interactions using
 * event delegation, debounce/throttle, IntersectionObserver, and DOM attribute filters.
 * 
 * Rules:
 * - Single delegated listener (no duplicate per-element listeners or leaks).
 * - Filters by data-buddy-target="true" and respects data-buddy-ignore="true".
 * - Forwards structured event descriptors to BuddyReactionManager.
 */
(function (global) {
    const _BUDDY_REACTION_CONFIG = (typeof global.BUDDY_REACTION_CONFIG !== 'undefined')
        ? global.BUDDY_REACTION_CONFIG
        : (typeof require !== 'undefined' ? require('./BuddyReactionConfig').BUDDY_REACTION_CONFIG : {});

    class BuddyEventDetector {
        /**
         * @param {BuddyReactionManager} reactionManager
         * @param {object} [config]
         */
        constructor(reactionManager = null, config = {}) {
            this.manager = reactionManager;
            this.config = { ..._BUDDY_REACTION_CONFIG, ...config };

            this.isAttached = false;
            this.container = null;

            // Debounce / Throttle timers
            this.hoverDebounceTimer = null;
            this.lastPointerTime = 0;
            this.currentHoveredElement = null;

            // IntersectionObserver for target visibility
            this.intersectionObserver = null;
            this.observedElements = new Set();

            // Bound handlers for clean removal
            this._handleMouseOver = this._handleMouseOver.bind(this);
            this._handleMouseOut = this._handleMouseOut.bind(this);
            this._handleClick = this._handleClick.bind(this);
            this._handleFocusIn = this._handleFocusIn.bind(this);
            this._handlePointerMove = this._handlePointerMove.bind(this);
        }

        setManager(reactionManager) {
            this.manager = reactionManager;
        }

        /**
         * Attach delegated event listeners to container (document.body by default)
         * @param {HTMLElement|Document} [container=document]
         */
        attach(container = null) {
            if (this.isAttached) return;
            if (typeof document === 'undefined') return;

            this.container = container || document;

            // Delegated browser listeners
            this.container.addEventListener('mouseover', this._handleMouseOver, { passive: true });
            this.container.addEventListener('mouseout', this._handleMouseOut, { passive: true });
            this.container.addEventListener('click', this._handleClick, { passive: true });
            this.container.addEventListener('focusin', this._handleFocusIn, { passive: true });

            if (this.config.pointerTracking?.enabled) {
                this.container.addEventListener('pointermove', this._handlePointerMove, { passive: true });
            }

            // Setup IntersectionObserver for visible/hidden detection
            this._setupIntersectionObserver();

            this.isAttached = true;
        }

        /**
         * Detach all listeners and observers cleanly
         */
        detach() {
            if (!this.isAttached || !this.container) return;

            this.container.removeEventListener('mouseover', this._handleMouseOver);
            this.container.removeEventListener('mouseout', this._handleMouseOut);
            this.container.removeEventListener('click', this._handleClick);
            this.container.removeEventListener('focusin', this._handleFocusIn);
            this.container.removeEventListener('pointermove', this._handlePointerMove);

            if (this.hoverDebounceTimer) {
                clearTimeout(this.hoverDebounceTimer);
                this.hoverDebounceTimer = null;
            }

            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect();
                this.intersectionObserver = null;
            }
            this.observedElements.clear();

            this.isAttached = false;
            this.container = null;
            this.currentHoveredElement = null;
        }

        /**
         * Check if element is an eligible Buddy target
         */
        _findValidTarget(element) {
            if (!element || typeof element.closest !== 'function') return null;

            // 1. Check if inside an ignored container
            const ignoreAttr = this.config.attributes?.ignore || 'data-buddy-ignore';
            if (element.closest(`[${ignoreAttr}="true"]`) || element.closest(`[${ignoreAttr}]`)) {
                return null;
            }

            // 2. Check if element or ancestor is a marked buddy target
            const targetAttr = this.config.attributes?.target || 'data-buddy-target';
            const targetEl = element.closest(`[${targetAttr}="true"]`) || element.closest(`[${targetAttr}]`);

            return targetEl || null;
        }

        _handleMouseOver(e) {
            if (!this.manager || !this.config.events?.hover?.enabled) return;

            const targetEl = this._findValidTarget(e.target);
            if (!targetEl || targetEl === this.currentHoveredElement) return;

            this.currentHoveredElement = targetEl;

            // Debounce rapid hover spam across elements
            const debounceMs = this.config.events?.hover?.debounceMs || 60;
            if (this.hoverDebounceTimer) {
                clearTimeout(this.hoverDebounceTimer);
            }

            this.hoverDebounceTimer = setTimeout(() => {
                if (this.currentHoveredElement === targetEl) {
                    const reactionAttr = this.config.attributes?.reaction || 'data-buddy-reaction';
                    const customReaction = targetEl.getAttribute(reactionAttr);

                    this.manager.handle({
                        type: 'hover',
                        target: targetEl,
                        targetId: targetEl.id || targetEl.getAttribute('data-buddy-id') || 'hovered-target',
                        reaction: customReaction || this.config.events.hover.defaultReaction,
                        priority: this.config.events.hover.priority,
                        duration: this.config.events.hover.duration,
                        timestamp: Date.now()
                    });
                }
            }, debounceMs);
        }

        _handleMouseOut(e) {
            if (this.currentHoveredElement && (!e.relatedTarget || !this.currentHoveredElement.contains(e.relatedTarget))) {
                this.currentHoveredElement = null;
                if (this.hoverDebounceTimer) {
                    clearTimeout(this.hoverDebounceTimer);
                    this.hoverDebounceTimer = null;
                }
            }
        }

        _handleClick(e) {
            if (!this.manager || !this.config.events?.click?.enabled) return;

            const targetEl = this._findValidTarget(e.target);
            if (!targetEl) return;

            const reactionAttr = this.config.attributes?.reaction || 'data-buddy-reaction';
            const customReaction = targetEl.getAttribute(reactionAttr);

            this.manager.handle({
                type: 'click',
                target: targetEl,
                targetId: targetEl.id || targetEl.getAttribute('data-buddy-id') || 'clicked-target',
                reaction: customReaction || this.config.events.click.defaultReaction,
                priority: this.config.events.click.priority,
                duration: this.config.events.click.duration,
                timestamp: Date.now()
            });
        }

        _handleFocusIn(e) {
            if (!this.manager || !this.config.events?.focus?.enabled) return;

            const targetEl = this._findValidTarget(e.target);
            if (!targetEl) return;

            this.manager.handle({
                type: 'focus',
                target: targetEl,
                targetId: targetEl.id || 'focused-target',
                reaction: this.config.events.focus.defaultReaction,
                priority: this.config.events.focus.priority,
                duration: this.config.events.focus.duration,
                timestamp: Date.now()
            });
        }

        _handlePointerMove(e) {
            if (!this.manager || !this.config.pointerTracking?.enabled) return;

            const now = Date.now();
            const throttleMs = this.config.pointerTracking.throttleMs || 50;
            if (now - this.lastPointerTime < throttleMs) return;

            this.lastPointerTime = now;

            this.manager.handle({
                type: 'pointer',
                target: { x: e.clientX, y: e.clientY },
                targetId: 'pointer-cursor',
                reaction: 'look',
                priority: this.config.pointerTracking.priority,
                duration: 0,
                timestamp: now
            });
        }

        /**
         * Setup IntersectionObserver for observing data-buddy-target elements
         */
        _setupIntersectionObserver() {
            if (typeof IntersectionObserver === 'undefined' || typeof document === 'undefined') return;

            try {
                this.intersectionObserver = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                        const targetEl = entry.target;
                        const targetId = targetEl.id || targetEl.getAttribute('data-buddy-id') || 'observed-target';

                        if (entry.isIntersecting) {
                            if (this.config.events?.['target-visible']?.enabled) {
                                this.manager.handle({
                                    type: 'target-visible',
                                    target: targetEl,
                                    targetId,
                                    reaction: this.config.events['target-visible'].defaultReaction,
                                    priority: this.config.events['target-visible'].priority,
                                    duration: this.config.events['target-visible'].duration,
                                    timestamp: Date.now()
                                });
                            }
                        } else {
                            if (this.config.events?.['target-hidden']?.enabled) {
                                this.manager.handle({
                                    type: 'target-hidden',
                                    target: targetEl,
                                    targetId,
                                    reaction: this.config.events['target-hidden'].defaultReaction,
                                    priority: this.config.events['target-hidden'].priority,
                                    duration: 0,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }, { threshold: 0.25 });

                this.refreshObservedElements();
            } catch (err) {
                console.warn('[BuddyEventDetector] IntersectionObserver initialization failed:', err);
            }
        }

        /**
         * Scan DOM and attach observer to all [data-buddy-target] elements
         */
        refreshObservedElements() {
            if (!this.intersectionObserver || typeof document === 'undefined') return;

            const targetAttr = this.config.attributes?.target || 'data-buddy-target';
            const targets = document.querySelectorAll(`[${targetAttr}="true"], [${targetAttr}]`);

            for (const el of targets) {
                if (!this.observedElements.has(el)) {
                    this.observedElements.add(el);
                    this.intersectionObserver.observe(el);
                }
            }
        }

        /**
         * Explicitly observe a specific DOM element
         */
        observeTarget(element) {
            if (this.intersectionObserver && element && !this.observedElements.has(element)) {
                this.observedElements.add(element);
                this.intersectionObserver.observe(element);
            }
        }

        /**
         * Unobserve a specific DOM element
         */
        unobserveTarget(element) {
            if (this.intersectionObserver && element && this.observedElements.has(element)) {
                this.observedElements.delete(element);
                this.intersectionObserver.unobserve(element);
            }
        }
    }

    global.BuddyEventDetector = BuddyEventDetector;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyEventDetector
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
