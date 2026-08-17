/**
 * Travel AI Buddy — Response Contract & Validator
 */
(function (global) {
    const ALLOWED_EMOTIONS = [
        'neutral',
        'happy',
        'sad',
        'excited',
        'surprised',
        'confused',
        'curious',
        'worried',
        'thinking'
    ];

    const ALLOWED_ANIMATIONS = [
        'idle',
        'wave',
        'happy',
        'sad',
        'surprised',
        'thinking',
        'celebrate',
        'point'
    ];

    const EMOTION_SYNONYMS = {
        joy: 'happy',
        joyful: 'happy',
        cheerful: 'happy',
        ecstatic: 'excited',
        shocked: 'surprised',
        alarmed: 'surprised',
        fear: 'worried',
        anxious: 'worried',
        puzzled: 'confused',
        pondering: 'thinking',
        calm: 'neutral'
    };

    function parseRawAIOutput(rawOutput) {
        if (!rawOutput) return null;
        if (typeof rawOutput === 'object') return rawOutput;

        try {
            let clean = String(rawOutput).trim();
            if (clean.startsWith('```')) {
                clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
            }

            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                clean = clean.slice(start, end + 1);
            }

            return JSON.parse(clean);
        } catch (err) {
            console.warn('[BuddyResponse] Failed to parse AI JSON:', err.message);
            return null;
        }
    }

    function validateAIResponse(raw, sourceEvent = '') {
        const parsed = parseRawAIOutput(raw);
        if (!parsed) {
            return createFallbackDecision(sourceEvent, 'Invalid JSON from AI');
        }

        let message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
        if (!message) {
            message = 'Ready for our next adventure! ✈️';
        }

        let emotion = typeof parsed.emotion === 'string' ? parsed.emotion.toLowerCase().trim() : 'neutral';
        if (!ALLOWED_EMOTIONS.includes(emotion)) {
            emotion = EMOTION_SYNONYMS[emotion] || 'neutral';
        }

        let animation = typeof parsed.animation === 'string' ? parsed.animation.toLowerCase().trim() : 'idle';
        if (!ALLOWED_ANIMATIONS.includes(animation)) {
            console.warn(`[BuddyResponse] Animation "${parsed.animation}" not supported. Safely falling back to "idle".`);
            animation = 'idle';
        }

        const gesture = typeof parsed.gesture === 'string' ? parsed.gesture : null;
        const duration = Math.max(2200, Math.min(5000, message.length * 70));

        return {
            message,
            emotion,
            animation,
            gesture,
            duration,
            timestamp: Date.now(),
            isFallback: false
        };
    }

    function createFallbackDecision(eventName = '', errorReason = '') {
        console.log(`[BuddyResponse] Creating fallback decision for "${eventName}" (Reason: ${errorReason || 'AI unavailable'})`);

        const fallbacks = {
            USER_STARTED_TRIP: {
                message: 'Welcome aboard! Let us plan an amazing journey together! ✈️',
                emotion: 'happy',
                animation: 'wave'
            },
            DESTINATION_SELECTED: {
                message: 'Fantastic choice! Exploring this destination will be incredible! 🌴',
                emotion: 'excited',
                animation: 'happy'
            },
            PLACE_SELECTED: {
                message: 'Adding this wonderful spot to our travel list! 📍',
                emotion: 'happy',
                animation: 'point'
            },
            HOTEL_SELECTED: {
                message: 'Checking hotel amenities and location details! 🏨',
                emotion: 'thinking',
                animation: 'thinking'
            },
            FLIGHT_SELECTED: {
                message: 'Flight locked in! Pack your bags! 🛫',
                emotion: 'excited',
                animation: 'celebrate'
            },
            WEATHER_CHANGED: {
                message: 'Weather update received! Dressing comfortably! ☀️',
                emotion: 'neutral',
                animation: 'thinking'
            },
            BUDGET_EXCEEDED: {
                message: 'Hold on! This option exceeds your planned trip budget! 💸',
                emotion: 'surprised',
                animation: 'surprised'
            },
            ITINERARY_COMPLETED: {
                message: 'Your itinerary is complete and ready to roll! Woohoo! 🎉',
                emotion: 'excited',
                animation: 'celebrate'
            },
            BOOKING_COMPLETED: {
                message: 'Booking confirmed! Safe travels on your adventure! 🎟️',
                emotion: 'happy',
                animation: 'celebrate'
            },
            USER_ASKED_BUDDY: {
                message: 'Here are the top highlights for your trip! Have a wonderful time! 🗺️',
                emotion: 'happy',
                animation: 'point'
            }
        };

        const template = fallbacks[eventName] || {
            message: 'Great step forward on your trip! Let us keep going! 🌟',
            emotion: 'happy',
            animation: 'happy'
        };

        return {
            ...template,
            gesture: null,
            duration: Math.max(2200, Math.min(5000, template.message.length * 70)),
            timestamp: Date.now(),
            isFallback: true,
            errorReason
        };
    }

    global.ALLOWED_EMOTIONS = ALLOWED_EMOTIONS;
    global.ALLOWED_ANIMATIONS = ALLOWED_ANIMATIONS;
    global.parseRawAIOutput = parseRawAIOutput;
    global.validateAIResponse = validateAIResponse;
    global.createFallbackDecision = createFallbackDecision;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            ALLOWED_EMOTIONS,
            ALLOWED_ANIMATIONS,
            parseRawAIOutput,
            validateAIResponse,
            createFallbackDecision
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
