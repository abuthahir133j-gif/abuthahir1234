/**
 * Travel AI Buddy — Lightweight Event Bus
 */
(function (global) {
    class BuddyEventBus {
        constructor() {
            this.listeners = new Map();
        }

        on(eventName, callback) {
            if (!this.listeners.has(eventName)) {
                this.listeners.set(eventName, new Set());
            }
            this.listeners.get(eventName).add(callback);
            return () => this.off(eventName, callback);
        }

        once(eventName, callback) {
            const wrapper = (...args) => {
                this.off(eventName, wrapper);
                callback(...args);
            };
            return this.on(eventName, wrapper);
        }

        off(eventName, callback) {
            if (!this.listeners.has(eventName)) return;
            this.listeners.get(eventName).delete(callback);
            if (this.listeners.get(eventName).size === 0) {
                this.listeners.delete(eventName);
            }
        }

        emit(eventName, data) {
            if (!this.listeners.has(eventName)) return;
            const callbacks = Array.from(this.listeners.get(eventName));
            for (const cb of callbacks) {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[BuddyEventBus] Error in listener for "${eventName}":`, err);
                }
            }
        }

        clear() {
            this.listeners.clear();
        }
    }

    const buddyEvents = new BuddyEventBus();

    global.BuddyEventBus = BuddyEventBus;
    global.buddyEvents = buddyEvents;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { buddyEvents, BuddyEventBus };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
