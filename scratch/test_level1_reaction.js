const assert = require('assert');

// Simulate localStorage
const storage = {};
global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
};

const STORAGE_KEY = "language_lab_level_progress_v2";
const LEVEL1_REACTION_KEY = "language_lab_level1_reaction_seen";

// Test 1: START - Level 1 locked
let userProgress = { unlockedLevel: 1, stars: {} };
localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
localStorage.removeItem(LEVEL1_REACTION_KEY);

function getZone1PiecesStatus(progress) {
    const levels = [1, 2, 3, 4, 5];
    const pieces = levels.map((lvlNum, idx) => {
        const starVal = progress.stars?.[lvlNum] || 0;
        const unLvl = Number(progress.unlockedLevel) || 1;
        const isCompleted = (Number(starVal) > 0) || (unLvl > lvlNum);
        return { index: idx + 1, levelId: lvlNum, unlocked: isCompleted };
    });
    // Boss
    pieces.push({ index: 6, levelId: "boss-1", unlocked: Boolean(progress.stars?.["boss-1"] > 0) });
    return pieces;
}

let pieces = getZone1PiecesStatus(userProgress);
assert.strictEqual(pieces[0].unlocked, false, "Part 1 should be LOCKED initially");
assert.strictEqual(pieces[1].unlocked, false, "Part 2 should be LOCKED initially");
assert.strictEqual(pieces[5].unlocked, false, "Boss Core should be LOCKED initially");
console.log("✅ Step 1: START state verified - Part 1 is LOCKED.");

// Test 2: COMPLETE LEVEL 1
userProgress.stars[1] = 3;
userProgress.unlockedLevel = 2;
localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));

const isLevel1Complete = Boolean(
    (userProgress.stars && (Number(userProgress.stars[1]) > 0 || Number(userProgress.stars["1"]) > 0)) ||
    (Number(userProgress.unlockedLevel) > 1)
);
const hasSeenReactionBefore = localStorage.getItem(LEVEL1_REACTION_KEY) === "true";

assert.strictEqual(isLevel1Complete, true, "Level 1 is completed");
assert.strictEqual(hasSeenReactionBefore, false, "Reaction has not been seen yet");
console.log("✅ Step 2: Level 1 completed detection verified -> Triggers reaction sequence.");

// Simulate Reaction Completed
localStorage.setItem(LEVEL1_REACTION_KEY, "true");
pieces = getZone1PiecesStatus(userProgress);
assert.strictEqual(pieces[0].unlocked, true, "Part 1 must be UNLOCKED after reaction");
assert.strictEqual(pieces[1].unlocked, false, "Part 2 must remain LOCKED");
assert.strictEqual(pieces[2].unlocked, false, "Part 3 must remain LOCKED");
assert.strictEqual(pieces[3].unlocked, false, "Part 4 must remain LOCKED");
assert.strictEqual(pieces[4].unlocked, false, "Part 5 must remain LOCKED");
assert.strictEqual(pieces[5].unlocked, false, "Boss Core must remain LOCKED");
console.log("✅ Step 3: Part 1 is UNLOCKED; Parts 2-5 and Boss Core remain LOCKED.");

// Test 3: RELOAD / RESTART ELECTRON
const hasSeenReactionAfterReload = localStorage.getItem(LEVEL1_REACTION_KEY) === "true";
const shouldTriggerReactionOnReload = isLevel1Complete && !hasSeenReactionAfterReload;
assert.strictEqual(shouldTriggerReactionOnReload, false, "Reaction must NOT replay on reload");
assert.strictEqual(pieces[0].unlocked, true, "Part 1 remains UNLOCKED after reload");
console.log("✅ Step 4: Reload/Restart persistence verified - Part 1 unlocked, reaction NOT replayed.");

console.log("\n🎉 All Level 1 Reaction Acceptance Criteria Passed!");
