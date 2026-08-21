/**
 * Travel AI Buddy — Step 6: Reaction Configuration
 * 
 * Centralized declarative configuration for browser event mappings,
 * priority levels, cooldown timings, debounce intervals, and action thresholds.
 */
(function (global) {
    const REACTION_PRIORITY = Object.freeze({
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

    const BUDDY_REACTION_CONFIG = {
        // Master toggle
        enabled: true,

        // Cooldown between reactions (ms)
        globalCooldown: 250,

        // Supported Browser Event Types & Rules
        events: {
            hover: {
                enabled: true,
                defaultReaction: 'look',
                priority: REACTION_PRIORITY.HOVER,
                cooldown: 280,
                debounceMs: 60,
                duration: 0, // Remains looking until mouseout or target change
                requireTargetAttribute: true // requires data-buddy-target
            },
            click: {
                enabled: true,
                defaultReaction: 'attention',
                priority: REACTION_PRIORITY.CLICK,
                cooldown: 350,
                duration: 600,
                requireTargetAttribute: true
            },
            focus: {
                enabled: true,
                defaultReaction: 'look',
                priority: REACTION_PRIORITY.FOCUS,
                cooldown: 300,
                duration: 0,
                requireTargetAttribute: true
            },
            success: {
                enabled: true,
                defaultReaction: 'positive',
                priority: REACTION_PRIORITY.SUCCESS,
                cooldown: 500,
                duration: 1200,
                requireTargetAttribute: false
            },
            error: {
                enabled: true,
                defaultReaction: 'negative',
                priority: REACTION_PRIORITY.ERROR,
                cooldown: 500,
                duration: 1200,
                requireTargetAttribute: false
            },
            navigation: {
                enabled: true,
                defaultReaction: 'curious',
                priority: REACTION_PRIORITY.NAVIGATION,
                cooldown: 600,
                duration: 800,
                requireTargetAttribute: false
            },
            'target-visible': {
                enabled: true,
                defaultReaction: 'look',
                priority: REACTION_PRIORITY.TARGET_VISIBLE,
                cooldown: 400,
                duration: 800,
                requireTargetAttribute: true
            },
            'target-hidden': {
                enabled: true,
                defaultReaction: 'release',
                priority: REACTION_PRIORITY.IDLE,
                cooldown: 100,
                duration: 0,
                requireTargetAttribute: true
            }
        },

        // Pointer / Mouse Tracking Configuration (disabled by default)
        pointerTracking: {
            enabled: false,
            throttleMs: 50,
            priority: REACTION_PRIORITY.HOVER
        },

        // DOM Attribute Names
        attributes: {
            target: 'data-buddy-target',
            reaction: 'data-buddy-reaction',
            ignore: 'data-buddy-ignore'
        },

        // Maximum events stored in memory dev log
        maxEventLogs: 50
    };

    global.REACTION_PRIORITY = REACTION_PRIORITY;
    global.BUDDY_REACTION_CONFIG = BUDDY_REACTION_CONFIG;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            REACTION_PRIORITY,
            BUDDY_REACTION_CONFIG
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
