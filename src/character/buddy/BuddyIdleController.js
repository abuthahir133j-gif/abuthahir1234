/**
 * Travel AI Buddy — Step 5: Natural Idle Behavior Scheduler
 * 
 * Manages subtle, randomized idle micro-behaviors (blinking, breathing, gentle head tilts,
 * and looking around) so the Buddy feels alive without repetitive loops.
 */
(function (global) {
    const _buddyAttention = (typeof global.buddyAttention !== 'undefined')
        ? global.buddyAttention
        : require('./BuddyAttention').buddyAttention;

    const _buddyExpression = (typeof global.buddyExpression !== 'undefined')
        ? global.buddyExpression
        : require('./BuddyExpressionController').buddyExpression;

    class BuddyIdleController {
        constructor(attention = _buddyAttention, expression = _buddyExpression) {
            this.attention = attention;
            this.expression = expression;

            this.isRunning = false;
            this.isPaused = false;
            this.minIntervalMs = 3500;
            this.maxIntervalMs = 7000;
            this.schedulerTimer = null;

            this.idleActions = [
                'blink',
                'look_left',
                'look_right',
                'head_tilt',
                'breathe',
                'look_user'
            ];
        }

        setEngines(attention, expression) {
            this.attention = attention;
            this.expression = expression;
        }

        /**
         * Start the randomized idle scheduler
         */
        start() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.isPaused = false;
            this.scheduleNext();
        }

        /**
         * Stop the scheduler
         */
        stop() {
            this.isRunning = false;
            this.clearTimer();
        }

        /**
         * Pause idle behavior during active speech / actions
         */
        pause() {
            this.isPaused = true;
            this.clearTimer();
        }

        /**
         * Resume idle behavior after speech / action completes
         */
        resume() {
            if (!this.isRunning) return;
            this.isPaused = false;
            this.scheduleNext();
        }

        scheduleNext() {
            this.clearTimer();
            if (!this.isRunning || this.isPaused) return;

            const delay = Math.floor(Math.random() * (this.maxIntervalMs - this.minIntervalMs)) + this.minIntervalMs;
            this.schedulerTimer = setTimeout(() => {
                this.performRandomIdleAction();
                this.scheduleNext();
            }, delay);
        }

        performRandomIdleAction() {
            if (!this.isRunning || this.isPaused) return;

            const action = this.idleActions[Math.floor(Math.random() * this.idleActions.length)];

            switch (action) {
                case 'blink':
                    this.expression?.blink(150);
                    break;

                case 'look_left':
                    this.attention?.lookAt('MAP', 0, 1800);
                    break;

                case 'look_right':
                    this.attention?.lookAt('NOTIFICATION', 0, 1800);
                    break;

                case 'look_user':
                    this.attention?.lookAt('USER', 0, 2000);
                    break;

                case 'head_tilt':
                    if (this.attention) {
                        this.attention.applyGazeToScene({ x: 0, y: 0, headRotate: 4 });
                        setTimeout(() => this.attention?.returnToDefault(), 1600);
                    }
                    break;

                case 'breathe':
                default:
                    this.expression?.blink(120);
                    break;
            }
        }

        clearTimer() {
            if (this.schedulerTimer) {
                clearTimeout(this.schedulerTimer);
                this.schedulerTimer = null;
            }
        }

        destroy() {
            this.stop();
        }
    }

    const buddyIdle = new BuddyIdleController();

    global.BuddyIdleController = BuddyIdleController;
    global.buddyIdle = buddyIdle;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyIdleController,
            buddyIdle
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
