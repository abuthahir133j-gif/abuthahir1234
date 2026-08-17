/**
 * Travel AI Buddy — Step 5: Attention System & Gaze Target Tracker
 * 
 * Smoothly interpolates the Buddy's gaze, eye position, and head orientation
 * toward targets such as USER, MAP, NOTIFICATION, or SCREEN coordinates.
 */
(function (global) {
    const ATTENTION_TARGETS = {
        USER: 'USER',
        MAP: 'MAP',
        PLACE: 'PLACE',
        BUTTON: 'BUTTON',
        NOTIFICATION: 'NOTIFICATION',
        DEFAULT: 'DEFAULT'
    };

    const ATTENTION_PRIORITY = {
        CRITICAL: 3,
        IMPORTANT: 2,
        NORMAL: 1,
        NONE: 0
    };

    class BuddyAttention {
        constructor(scene = null) {
            this.scene = scene;
            this.currentTarget = ATTENTION_TARGETS.DEFAULT;
            this.currentPriority = ATTENTION_PRIORITY.NONE;
            this.gazeOffset = { x: 0, y: 0 };
            this.targetDuration = 0;
            this.attentionTimer = null;
            this.listeners = new Set();
        }

        setScene(scene) {
            this.scene = scene;
        }

        /**
         * Focus character attention toward a specific target
         * @param {string} targetKey ('USER' | 'MAP' | 'PLACE' | 'BUTTON' | 'NOTIFICATION' | 'DEFAULT')
         * @param {number} [priority=1] (0 to 3)
         * @param {number} [duration=0] (0 = hold until changed)
         * @returns {boolean}
         */
        lookAt(targetKey = ATTENTION_TARGETS.USER, priority = ATTENTION_PRIORITY.NORMAL, duration = 0) {
            if (priority < this.currentPriority && this.attentionTimer) {
                // Ignore lower priority target while higher priority is active
                return false;
            }

            if (this.attentionTimer) {
                clearTimeout(this.attentionTimer);
                this.attentionTimer = null;
            }

            this.currentTarget = targetKey;
            this.currentPriority = priority;

            // Compute offset values based on target
            let targetOffset = { x: 0, y: 0, headRotate: 0 };
            switch (targetKey) {
                case ATTENTION_TARGETS.USER:
                    targetOffset = { x: 0, y: 3, headRotate: 0 }; // Looking slightly forward/down at user
                    break;
                case ATTENTION_TARGETS.MAP:
                    targetOffset = { x: -6, y: -2, headRotate: -8 }; // Looking left/up towards game map
                    break;
                case ATTENTION_TARGETS.PLACE:
                case ATTENTION_TARGETS.BUTTON:
                    targetOffset = { x: -4, y: 2, headRotate: -5 };
                    break;
                case ATTENTION_TARGETS.NOTIFICATION:
                    targetOffset = { x: 4, y: -5, headRotate: 6 };
                    break;
                default:
                    targetOffset = { x: 0, y: 0, headRotate: 0 };
                    break;
            }

            this.gazeOffset = targetOffset;
            this.applyGazeToScene(targetOffset);
            this.notify(targetKey);

            if (duration > 0) {
                this.attentionTimer = setTimeout(() => {
                    this.returnToDefault();
                }, duration);
            }

            return true;
        }

        applyGazeToScene(offset) {
            if (!this.scene || !this.scene.characterElement) return;

            const head = this.scene.characterElement.querySelector('#head');
            const face = this.scene.characterElement.querySelector('#face-features');

            if (head) {
                head.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                head.style.transform = offset.headRotate !== 0
                    ? `rotate(${offset.headRotate}deg) translateY(${offset.y}px)`
                    : `translateY(${offset.y}px)`;
            }

            if (face) {
                face.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                face.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
            }
        }

        returnToDefault() {
            this.lookAt(ATTENTION_TARGETS.DEFAULT, ATTENTION_PRIORITY.NONE, 0);
            this.currentPriority = ATTENTION_PRIORITY.NONE;
        }

        getTarget() {
            return this.currentTarget;
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.currentTarget);
            return () => this.listeners.delete(listener);
        }

        notify(target) {
            for (const l of this.listeners) {
                try {
                    l(target);
                } catch (e) {}
            }
        }

        destroy() {
            if (this.attentionTimer) {
                clearTimeout(this.attentionTimer);
                this.attentionTimer = null;
            }
            this.listeners.clear();
        }
    }

    const buddyAttention = new BuddyAttention();

    global.ATTENTION_TARGETS = ATTENTION_TARGETS;
    global.ATTENTION_PRIORITY = ATTENTION_PRIORITY;
    global.BuddyAttention = BuddyAttention;
    global.buddyAttention = buddyAttention;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ATTENTION_TARGETS,
            ATTENTION_PRIORITY,
            BuddyAttention,
            buddyAttention
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
