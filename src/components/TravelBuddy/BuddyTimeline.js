/**
 * Travel AI Buddy — Step 2: Central Buddy Timeline & Action Sequencer
 * 
 * Supports:
 * - Multi-track keyframes with precise time offsets (ms)
 * - Parallel & sequential group scheduling
 * - Playback controls (play, pause, resume, cancel, seek)
 * - Promise-based completion chains
 */
(function (global) {
    const _StateModule = (typeof global.BuddyAnimationState !== 'undefined')
        ? global.BuddyAnimationState
        : (typeof require !== 'undefined' ? require('./BuddyAnimationState') : {});

    const resolveEasing = _StateModule.resolveEasing || ((t) => t * (2 - t));
    const AnimationPriority = _StateModule.AnimationPriority || { IDLE: 1, NORMAL: 2, IMPORTANT: 3, CRITICAL: 4 };

    const _raf = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame
        : ((cb) => setTimeout(() => cb((typeof performance !== 'undefined' ? performance.now() : Date.now())), 16));

    const _caf = (typeof cancelAnimationFrame !== 'undefined')
        ? cancelAnimationFrame
        : ((id) => clearTimeout(id));

    class BuddyTimeline {
        constructor(engine, options = {}) {
            this.engine = engine;
            this.id = options.id || `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            this.priority = options.priority || AnimationPriority.NORMAL;
            this.owner = options.owner || this.id;

            // List of timeline entries:
            // { timeMs, duration, part, properties, easing, options }
            this.tracks = [];

            this.isPlaying = false;
            this.isPaused = false;
            this.currentTime = 0;
            this.totalDuration = 0;

            this._rafId = null;
            this._startTime = 0;
            this._pauseTime = 0;
            this._progressCallbacks = new Set();
            this._completionCallbacks = new Set();
            this._resolvePromise = null;
            this._rejectPromise = null;
        }

        /**
         * Add a keyframe / transition to the timeline at an explicit time offset
         * @param {number} timeOffsetMs (Offset from start of timeline)
         * @param {string} partKey
         * @param {object} properties
         * @param {object} [options] { duration, easing }
         */
        add(timeOffsetMs, partKey, properties, options = {}) {
            const duration = options.duration !== undefined ? options.duration : 300;
            const easing = resolveEasing(options.easing || 'easeOut');

            this.tracks.push({
                timeMs: Math.max(0, timeOffsetMs),
                duration,
                part: partKey,
                properties,
                easing,
                executed: false
            });

            this.totalDuration = Math.max(this.totalDuration, timeOffsetMs + duration);
            return this;
        }

        /**
         * Add a sequential step to the end of the timeline
         * @param {string|object[]} partOrItems
         * @param {object} [properties]
         * @param {object} [options]
         */
        addStep(partOrItems, properties = {}, options = {}) {
            const startTime = this.totalDuration;
            
            if (Array.isArray(partOrItems)) {
                // Parallel array of items at current end timestamp
                let stepMaxDuration = 0;
                for (const item of partOrItems) {
                    const dur = item.duration || options.duration || 300;
                    this.add(startTime + (item.delay || 0), item.part, item.properties, {
                        duration: dur,
                        easing: item.easing || options.easing
                    });
                    stepMaxDuration = Math.max(stepMaxDuration, (item.delay || 0) + dur);
                }
                this.totalDuration = startTime + stepMaxDuration;
            } else {
                const dur = options.duration !== undefined ? options.duration : 300;
                this.add(startTime + (options.delay || 0), partOrItems, properties, options);
            }
            return this;
        }

        /**
         * Add parallel tracks at current timeline head
         */
        parallel(items, options = {}) {
            return this.addStep(items, {}, options);
        }

        /**
         * Play the timeline from beginning or current position
         * @returns {Promise} Resolves when timeline completes
         */
        play() {
            if (this.isPlaying && !this.isPaused) return this._promise;

            this.isPlaying = true;
            this.isPaused = false;
            this._startTime = performance.now() - this.currentTime;

            // Reset execution flags
            for (const track of this.tracks) {
                if (track.timeMs >= this.currentTime) {
                    track.executed = false;
                }
            }

            this._promise = new Promise((resolve, reject) => {
                this._resolvePromise = resolve;
                this._rejectPromise = reject;
            });

            this._tick();
            return this._promise;
        }

        /**
         * Pause timeline playback
         */
        pause() {
            if (!this.isPlaying || this.isPaused) return;
            this.isPaused = true;
            this._pauseTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            if (this._rafId) {
                _caf(this._rafId);
                this._rafId = null;
            }
        }

        /**
         * Resume timeline playback from pause
         */
        resume() {
            if (!this.isPlaying || !this.isPaused) return;
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const pausedDuration = now - this._pauseTime;
            this._startTime += pausedDuration;
            this.isPaused = false;
            this._tick();
        }

        /**
         * Cancel / Stop timeline playback
         */
        cancel() {
            this.isPlaying = false;
            this.isPaused = false;
            if (this._rafId) {
                _caf(this._rafId);
                this._rafId = null;
            }
            if (this._rejectPromise) {
                this._rejectPromise(new Error('Timeline cancelled'));
            }
        }

        _tick() {
            if (!this.isPlaying || this.isPaused) return;

            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.currentTime = now - this._startTime;

            // Check tracks ready to execute
            for (const track of this.tracks) {
                if (!track.executed && this.currentTime >= track.timeMs) {
                    track.executed = true;
                    if (this.engine) {
                        this.engine.animate(track.part, track.properties, {
                            duration: track.duration,
                            easing: track.easing,
                            priority: this.priority,
                            owner: this.owner
                        }).catch(() => {});
                    }
                }
            }

            // Progress notification
            const progress = this.totalDuration > 0 ? Math.min(1, this.currentTime / this.totalDuration) : 1;
            for (const cb of this._progressCallbacks) {
                cb(progress, this.currentTime);
            }

            // Check completion
            if (this.currentTime >= this.totalDuration) {
                this.isPlaying = false;
                for (const cb of this._completionCallbacks) {
                    cb();
                }
                if (this._resolvePromise) {
                    this._resolvePromise();
                }
                return;
            }

            this._rafId = _raf(() => this._tick());
        }

        onProgress(callback) {
            this._progressCallbacks.add(callback);
            return this;
        }

        onComplete(callback) {
            this._completionCallbacks.add(callback);
            return this;
        }

        then(onFulfilled, onRejected) {
            return (this._promise || this.play()).then(onFulfilled, onRejected);
        }
    }

    global.BuddyTimeline = BuddyTimeline;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyTimeline;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
