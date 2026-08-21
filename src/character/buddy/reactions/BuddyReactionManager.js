/**
 * Travel AI Buddy — Step 6: Master Reaction Manager
 * 
 * Central controller bridging real-time browser events and semantic character reactions:
 * - Cooldown & debouncing enforcement (no animation spam)
 * - Strict priority queueing
 * - Target resolution & safe release when targets disappear
 * - Developer event log ring buffer
 * - Seamless integration with Gaze, Point, Face, and Animation Engine
 */
(function (global) {
    const _BUDDY_REACTION_CONFIG = (typeof global.BUDDY_REACTION_CONFIG !== 'undefined')
        ? global.BUDDY_REACTION_CONFIG
        : (typeof require !== 'undefined' ? require('./BuddyReactionConfig').BUDDY_REACTION_CONFIG : {});

    const _REACTION_PRIORITY = (typeof global.REACTION_PRIORITY !== 'undefined')
        ? global.REACTION_PRIORITY
        : (typeof require !== 'undefined' ? require('./BuddyReactionConfig').REACTION_PRIORITY : {
            IDLE: 1,
            HOVER: 2,
            FOCUS: 2,
            TARGET_VISIBLE: 2,
            CLICK: 3,
            NAVIGATION: 3,
            SUCCESS: 4,
            ERROR: 4,
            IMPORTANT_AI_ACTION: 5
        });

    class BuddyReactionManager {
        /**
         * @param {object} controllers { gazeController, pointAction, faceController, animationEngine, rig }
         * @param {object} [config]
         */
        constructor(controllers = {}, config = {}) {
            this.gazeController = controllers.gazeController || null;
            this.pointAction = controllers.pointAction || null;
            this.faceController = controllers.faceController || null;
            this.engine = controllers.animationEngine || null;
            this.rig = controllers.rig || null;

            this.config = { ..._BUDDY_REACTION_CONFIG, ...config };

            // Internal state
            this.currentPriority = _REACTION_PRIORITY.IDLE;
            this.currentReactionType = 'NONE';
            this.currentTargetId = 'NONE';
            this.currentTarget = null;
            this.lastReactionTime = 0;
            this.isBusy = false;

            // Priority Reaction Queue
            this.reactionQueue = [];
            this.cooldownTimer = null;

            // Development Event Log Ring Buffer (max 50)
            this.eventLogs = [];

            this.state = {
                currentEvent: 'NONE',
                currentReaction: 'NONE',
                target: 'NONE',
                priority: 'IDLE (1)',
                cooldown: 'READY',
                queueSize: 0,
                lastEvent: 'NONE'
            };

            this.listeners = new Set();
        }

        setControllers(controllers = {}) {
            if (controllers.gazeController) this.gazeController = controllers.gazeController;
            if (controllers.pointAction) this.pointAction = controllers.pointAction;
            if (controllers.faceController) this.faceController = controllers.faceController;
            if (controllers.animationEngine) this.engine = controllers.animationEngine;
            if (controllers.rig) this.rig = controllers.rig;
        }

        /**
         * Central entry point to handle incoming browser or application events
         * @param {object} eventDescriptor { type, target, targetId, reaction, priority, duration, speed }
         * @returns {Promise<object>} Status result
         */
        async handle(eventDescriptor = {}) {
            if (!this.config.enabled || !eventDescriptor || !eventDescriptor.type) {
                return { success: false, reason: 'DISABLED_OR_INVALID_EVENT' };
            }

            const type = eventDescriptor.type;
            const target = eventDescriptor.target || eventDescriptor.targetId || 'USER';
            const targetId = eventDescriptor.targetId || (typeof target === 'string' ? target : 'target');
            const eventRule = this.config.events?.[type] || {};

            if (eventRule.enabled === false) {
                return { success: false, reason: 'EVENT_TYPE_DISABLED' };
            }

            const priority = eventDescriptor.priority || eventRule.priority || _REACTION_PRIORITY.HOVER;
            const cooldown = eventDescriptor.cooldown || eventRule.cooldown || this.config.globalCooldown || 250;
            const reaction = eventDescriptor.reaction || eventRule.defaultReaction || 'look';
            const duration = eventDescriptor.duration !== undefined ? eventDescriptor.duration : (eventRule.duration || 400);
            const speed = eventDescriptor.speed || 1;
            const now = Date.now();

            // 1. Check Cooldown & Priority vs Active Reaction
            const isPointActive = !!(this.pointAction && this.pointAction.isActive);
            const activePriority = isPointActive ? Math.max(this.currentPriority, _REACTION_PRIORITY.CLICK) : this.currentPriority;
            const isCurrentlyBusy = this.isBusy || isPointActive;

            const timeSinceLast = now - this.lastReactionTime;
            const inCooldown = timeSinceLast < cooldown;

            if (isCurrentlyBusy || inCooldown) {
                // If incoming event is higher priority, it can interrupt or queue
                if (priority > activePriority) {
                    // Higher priority interrupts
                    this._logEvent(type, targetId, reaction, priority, 'INTERRUPT');
                } else if (priority === activePriority && (type === 'success' || type === 'error' || type === 'click')) {
                    // Queue important equal priority events
                    this._queueReaction({ type, target, targetId, reaction, priority, duration, speed });
                    this._logEvent(type, targetId, reaction, priority, 'QUEUED');
                    return { success: true, status: 'QUEUED' };
                } else {
                    // Lower priority during cooldown is discarded (prevents hover spam)
                    this._logEvent(type, targetId, reaction, priority, 'DISCARDED_COOLDOWN');
                    return { success: false, reason: 'DISCARDED_COOLDOWN' };
                }
            }

            // 2. Execute Reaction
            return this._executeReaction({ type, target, targetId, reaction, priority, duration, speed, cooldown });
        }

        async _executeReaction({ type, target, targetId, reaction, priority, duration, speed, cooldown }) {
            this.isBusy = true;
            this.currentPriority = priority;
            this.currentReactionType = reaction;
            this.currentTargetId = targetId;
            this.currentTarget = target;
            this.lastReactionTime = Date.now();

            this.state = {
                currentEvent: type.toUpperCase(),
                currentReaction: reaction.toUpperCase(),
                target: targetId,
                priority: `${priority}`,
                cooldown: 'ACTIVE',
                queueSize: this.reactionQueue.length,
                lastEvent: `${type.toUpperCase()} → ${reaction.toUpperCase()} (${targetId})`
            };
            this._notifyState();
            this._logEvent(type, targetId, reaction, priority, 'EXECUTED');

            try {
                let actionResult = { success: true };

                switch (reaction.toLowerCase()) {
                    case 'point':
                        if (this.pointAction) {
                            actionResult = await this.pointAction.execute({ target, holdDuration: duration, priority, speed });
                        }
                        break;

                    case 'attention':
                        // Short look + subtle happy smile
                        if (this.gazeController) {
                            this.gazeController.lookAt(target, { priority, holdDuration: duration, speed });
                        }
                        if (this.faceController) {
                            this.faceController.setEmotion('happy', { duration: Math.min(duration, 400), priority });
                        }
                        break;

                    case 'positive':
                    case 'happy':
                    case 'success':
                        // Positive face + look
                        if (this.faceController) {
                            this.faceController.setEmotion('happy', { duration, priority });
                        }
                        if (this.gazeController) {
                            this.gazeController.lookAt(target, { priority, holdDuration: duration, speed });
                        }
                        break;

                    case 'negative':
                    case 'sad':
                    case 'error':
                        // Sad face + glance
                        if (this.faceController) {
                            this.faceController.setEmotion('sad', { duration, priority });
                        }
                        if (this.gazeController) {
                            this.gazeController.lookAt(target, { priority, holdDuration: duration, speed });
                        }
                        break;

                    case 'curious':
                    case 'thinking':
                        // Inquisitive face + look
                        if (this.faceController) {
                            this.faceController.setEmotion('thinking', { duration, priority });
                        }
                        if (this.gazeController) {
                            this.gazeController.lookAt(target, { priority, holdDuration: duration, speed });
                        }
                        break;

                    case 'release':
                        // Safely return to neutral
                        if (this.gazeController) {
                            await this.gazeController.clearGaze({ animated: true, duration: 250 });
                        }
                        if (this.faceController) {
                            await this.faceController.resetFace({ duration: 250 });
                        }
                        break;

                    case 'look':
                    default:
                        if (this.gazeController) {
                            actionResult = await this.gazeController.lookAt(target, { priority, holdDuration: duration, speed });
                        }
                        break;
                }

                // Reaction finished
                this.isBusy = false;
                this.currentPriority = _REACTION_PRIORITY.IDLE;
                this.state.cooldown = 'READY';
                this._notifyState();

                // Process next item in queue if available
                if (this.reactionQueue.length > 0) {
                    const next = this.reactionQueue.shift();
                    this.state.queueSize = this.reactionQueue.length;
                    this._notifyState();
                    return this._executeReaction(next);
                }

                return actionResult;
            } catch (err) {
                console.error('[BuddyReactionManager] Error during reaction execution:', err);
                this.isBusy = false;
                this.currentPriority = _REACTION_PRIORITY.IDLE;
                this.state.cooldown = 'READY';
                this._notifyState();
                return { success: false, error: err.message };
            }
        }

        _queueReaction(reactionItem) {
            // Keep queue clean: max 5 items
            if (this.reactionQueue.length >= 5) {
                this.reactionQueue.shift();
            }
            this.reactionQueue.push(reactionItem);
            this.state.queueSize = this.reactionQueue.length;
            this._notifyState();
        }

        /**
         * Log event to in-memory development buffer
         */
        _logEvent(type, targetId, reaction, priority, status) {
            const timeStr = new Date().toLocaleTimeString();
            const logEntry = {
                time: timeStr,
                type: type.toUpperCase(),
                target: targetId,
                reaction: reaction.toUpperCase(),
                priority,
                status,
                timestamp: Date.now()
            };

            this.eventLogs.unshift(logEntry);
            if (this.eventLogs.length > (this.config.maxEventLogs || 50)) {
                this.eventLogs.pop();
            }
        }

        getEventLogs() {
            return [...this.eventLogs];
        }

        clearEventLogs() {
            this.eventLogs = [];
            this.state.lastEvent = 'NONE';
            this._notifyState();
        }

        reset() {
            this.reactionQueue = [];
            this.isBusy = false;
            this.currentPriority = _REACTION_PRIORITY.IDLE;
            this.currentReactionType = 'NONE';
            this.currentTargetId = 'NONE';
            this.currentTarget = null;

            if (this.gazeController) {
                this.gazeController.clearGaze({ animated: true, duration: 250 });
            }
            if (this.faceController) {
                this.faceController.resetFace({ duration: 250 });
            }

            this.state = {
                currentEvent: 'NONE',
                currentReaction: 'NONE',
                target: 'NONE',
                priority: 'IDLE (1)',
                cooldown: 'READY',
                queueSize: 0,
                lastEvent: 'RESET'
            };
            this._notifyState();
        }

        getState() {
            return { ...this.state };
        }

        onStateChange(callback) {
            this.listeners.add(callback);
            callback(this.getState());
            return () => this.listeners.delete(callback);
        }

        _notifyState() {
            const st = this.getState();
            for (const cb of this.listeners) {
                try {
                    cb(st);
                } catch (e) {
                    console.error('[BuddyReactionManager] Error in listener:', e);
                }
            }
        }
    }

    global.BuddyReactionManager = BuddyReactionManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyReactionManager
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
