/**
 * Travel AI Buddy — Step 7: User Preferences & Travel Profile
 * 
 * Manages persistent user travel preferences (travel styles, pacing, dietary,
 * accessibility) and provides reactive change notifications.
 */
(function (global) {
    const _memoryStore = (typeof global.memoryStore !== 'undefined')
        ? global.memoryStore
        : require('./memoryStore').memoryStore;

    const DEFAULT_PREFERENCES = {
        travelStyle: 'culture', // 'culture' | 'foodie' | 'adventure' | 'budget' | 'luxury' | 'nature' | 'relaxation'
        pacing: 'moderate',     // 'relaxed' (1-2 acts/day) | 'moderate' (3-4 acts/day) | 'packed' (5+ acts/day)
        dietary: 'none',        // 'none' | 'vegetarian' | 'vegan' | 'halal' | 'gluten_free'
        accessibility: 'none',  // 'none' | 'wheelchair' | 'step_free'
        budgetTier: 'standard', // 'budget' | 'standard' | 'luxury'
        interests: ['museums', 'local food', 'historic sights'],
        avoidCrowds: false
    };

    class UserPreferences {
        constructor(store = _memoryStore) {
            this.store = store;
            this.listeners = new Set();
            this.preferences = { ...DEFAULT_PREFERENCES, ...this.load() };
        }

        load() {
            return this.store.get('user_preferences', DEFAULT_PREFERENCES);
        }

        save() {
            this.store.set('user_preferences', this.preferences);
            this.notify();
        }

        get() {
            return { ...this.preferences };
        }

        update(partial) {
            this.preferences = {
                ...this.preferences,
                ...partial
            };
            this.save();
        }

        setTravelStyle(style) {
            this.update({ travelStyle: style });
        }

        setPacing(pacing) {
            this.update({ pacing: pacing });
        }

        setDietary(dietary) {
            this.update({ dietary: dietary });
        }

        setAccessibility(accessibility) {
            this.update({ accessibility: accessibility });
        }

        reset() {
            this.preferences = { ...DEFAULT_PREFERENCES };
            this.save();
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.get());
            return () => this.listeners.delete(listener);
        }

        notify() {
            const prefs = this.get();
            for (const l of this.listeners) {
                try {
                    l(prefs);
                } catch (e) {}
            }
        }
    }

    const userPreferences = new UserPreferences();

    global.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
    global.UserPreferences = UserPreferences;
    global.userPreferences = userPreferences;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            DEFAULT_PREFERENCES,
            UserPreferences,
            userPreferences
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
