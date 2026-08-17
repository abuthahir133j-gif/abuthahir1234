/**
 * Travel AI Buddy — Step 7: Unified Memory Facade
 * 
 * Central coordinator combining user travel profile, saved bookmarks,
 * visited history, and short-term conversation context.
 */
(function (global) {
    const _memoryStore = (typeof global.memoryStore !== 'undefined')
        ? global.memoryStore
        : require('./memoryStore').memoryStore;

    const _userPreferences = (typeof global.userPreferences !== 'undefined')
        ? global.userPreferences
        : require('./userPreferences').userPreferences;

    const _tripMemory = (typeof global.tripMemory !== 'undefined')
        ? global.tripMemory
        : require('./tripMemory').tripMemory;

    const _conversationMemory = (typeof global.conversationMemory !== 'undefined')
        ? global.conversationMemory
        : require('./conversationMemory').conversationMemory;

    class BuddyMemory {
        constructor() {
            this.store = _memoryStore;
            this.preferences = _userPreferences;
            this.trips = _tripMemory;
            this.conversation = _conversationMemory;
        }

        /**
         * Get a compact, normalized memory summary for AI context injection
         * @returns {Object}
         */
        getMemorySummary() {
            const prefs = this.preferences.get();
            const saved = this.trips.getSavedPlaces();

            return {
                travelStyle: prefs.travelStyle,
                dietary: prefs.dietary,
                pacing: prefs.pacing,
                accessibility: prefs.accessibility,
                savedPlacesCount: saved.length,
                savedPlacesNames: saved.slice(0, 5).map(p => p.name),
                lastTopic: this.conversation.getLastTopic()
            };
        }

        clearAll() {
            this.preferences.reset();
            this.trips.clear();
            this.conversation.clear();
            this.store.clear();
        }
    }

    const buddyMemory = new BuddyMemory();

    global.BuddyMemory = BuddyMemory;
    global.buddyMemory = buddyMemory;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BuddyMemory,
            buddyMemory
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
