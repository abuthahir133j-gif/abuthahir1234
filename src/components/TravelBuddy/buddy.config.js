/**
 * Travel AI Buddy — Configuration & Reaction Mappings
 */
(function (global) {
    const buddyConfig = {
        // Initial State
        initialState: {
            visible: true,
            emotion: 'neutral',
            animation: 'idle',
            speaking: false
        },

        // Fixed Character Configuration (Locked)
        character: {
            asset: 'AI/png.svg',
            allowCharacterSwap: false,
            locked: true
        },

        // Character Rendering Asset
        asset: {
            type: 'svg',
            path: 'AI/png.svg',
            fallbackPlaceholder: '🤖'
        },

        // Viewport Placement
        placement: {
            position: 'bottom-right',
            offsetX: 24,
            offsetY: 24,
            scale: 1.0,
            zIndex: 9999
        },

        // Developer Debug Panel
        debug: {
            enabled: false,
            autoMount: false,
            startMinimized: false
        },

        // Supported Animations & Default Timing
        animations: {
            idle: { duration: 0, isLoop: true, emotion: 'neutral' },
            wave: { duration: 2400, isLoop: false, emotion: 'happy' },
            happy: { duration: 2000, isLoop: false, emotion: 'happy' },
            sad: { duration: 2600, isLoop: false, emotion: 'sad' },
            surprised: { duration: 2200, isLoop: false, emotion: 'surprised' },
            thinking: { duration: 2800, isLoop: false, emotion: 'thinking' },
            excited: { duration: 2400, isLoop: false, emotion: 'excited' },
            celebrate: { duration: 3200, isLoop: false, emotion: 'excited' },
            point: { duration: 2200, isLoop: false, emotion: 'neutral' }
        },

        // Supported Emotions
        emotions: [
            'neutral',
            'happy',
            'sad',
            'surprised',
            'thinking',
            'excited',
            'curious',
            'confused',
            'worried'
        ],

        // Centralized Event → Reaction Mapping
        reactions: {
            USER_STARTED_TRIP: {
                animation: 'wave',
                emotion: 'happy',
                caption: 'Have a fantastic journey! ✈️'
            },
            DESTINATION_SELECTED: {
                animation: 'happy',
                emotion: 'excited',
                caption: 'Great destination choice! 🌴'
            },
            PLACE_SELECTED: {
                animation: 'point',
                emotion: 'happy',
                caption: 'Take a look over here! 📍'
            },
            HOTEL_SELECTED: {
                animation: 'thinking',
                emotion: 'neutral',
                caption: 'Checking hotel availability... 🏨'
            },
            FLIGHT_SELECTED: {
                animation: 'celebrate',
                emotion: 'excited',
                caption: 'Flight booked! Fasten your seatbelts! 🛫'
            },
            WEATHER_CHANGED: {
                animation: 'thinking',
                emotion: 'neutral',
                caption: 'Checking the forecast... ☀️'
            },
            BUDGET_EXCEEDED: {
                animation: 'surprised',
                emotion: 'surprised',
                caption: 'Whoa! Budget limit exceeded! 💸'
            },
            ITINERARY_COMPLETED: {
                animation: 'celebrate',
                emotion: 'excited',
                caption: 'Itinerary ready! You are all set! 🎉'
            },
            BOOKING_COMPLETED: {
                animation: 'celebrate',
                emotion: 'happy',
                caption: 'Booking confirmed! Wonderful! 🎟️'
            },
            LEVEL_COMPLETED: {
                animation: 'celebrate',
                emotion: 'excited',
                caption: 'Level cleared! Awesome job! ⭐'
            },
            DAILY_CHALLENGE: {
                animation: 'happy',
                emotion: 'excited',
                caption: 'Daily quest active! Let\'s go! 🎯'
            }
        }
    };

    global.buddyConfig = buddyConfig;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = buddyConfig;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
