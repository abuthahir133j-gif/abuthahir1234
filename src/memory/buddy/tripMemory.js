/**
 * Travel AI Buddy — Step 7: Persistent Trip & Saved Places Memory
 * 
 * Manages user's saved places, trip bookmarks, notes, and visited history.
 */
(function (global) {
    const _memoryStore = (typeof global.memoryStore !== 'undefined')
        ? global.memoryStore
        : require('./memoryStore').memoryStore;

    class TripMemory {
        constructor(store = _memoryStore) {
            this.store = store;
            this.savedPlaces = this.loadSavedPlaces();
            this.visitedPlaces = this.loadVisitedPlaces();
            this.listeners = new Set();
        }

        loadSavedPlaces() {
            return this.store.get('saved_places', []);
        }

        loadVisitedPlaces() {
            return this.store.get('visited_places', []);
        }

        savePlace(place, note = '') {
            if (!place) return;
            const placeId = place.id || place.name?.toLowerCase().replace(/\s+/g, '_') || 'place';

            // Remove existing if any
            this.savedPlaces = this.savedPlaces.filter(p => p.id !== placeId);

            this.savedPlaces.push({
                id: placeId,
                name: place.name || 'Place',
                category: place.category || 'landmark',
                location: place.location || 'City',
                note: note,
                isOutdoor: Boolean(place.isOutdoor),
                savedAt: Date.now()
            });

            this.store.set('saved_places', this.savedPlaces);
            this.notify();
        }

        removeSavedPlace(placeId) {
            this.savedPlaces = this.savedPlaces.filter(p => p.id !== placeId);
            this.store.set('saved_places', this.savedPlaces);
            this.notify();
        }

        isPlaceSaved(placeIdOrName) {
            if (!placeIdOrName) return false;
            const target = String(placeIdOrName).toLowerCase();
            return this.savedPlaces.some(p => p.id === target || p.name.toLowerCase() === target);
        }

        getSavedPlaces() {
            return [...this.savedPlaces];
        }

        recordVisitedPlace(place) {
            if (!place) return;
            const placeId = place.id || place.name;
            if (!this.visitedPlaces.includes(placeId)) {
                this.visitedPlaces.push(placeId);
                this.store.set('visited_places', this.visitedPlaces);
            }
        }

        getVisitedPlaces() {
            return [...this.visitedPlaces];
        }

        clear() {
            this.savedPlaces = [];
            this.visitedPlaces = [];
            this.store.remove('saved_places');
            this.store.remove('visited_places');
            this.notify();
        }

        onChange(listener) {
            this.listeners.add(listener);
            listener(this.savedPlaces);
            return () => this.listeners.delete(listener);
        }

        notify() {
            const list = this.getSavedPlaces();
            for (const l of this.listeners) {
                try {
                    l(list);
                } catch (e) {}
            }
        }
    }

    const tripMemory = new TripMemory();

    global.TripMemory = TripMemory;
    global.tripMemory = tripMemory;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { TripMemory, tripMemory };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
