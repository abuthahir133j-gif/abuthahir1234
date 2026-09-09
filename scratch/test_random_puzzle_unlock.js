// Test Random Order Puzzle Piece Unlock System
const assert = require('assert');

const ZONE_PUZZLE_CONFIG = {
    1: {
        zone: 1,
        zoneName: "Forest Realm",
        nextFormName: "Ice Blue AI-Buddy",
        bossId: "boss-1",
        levels: [1, 2, 3, 4, 5]
    }
};

let userProgress = {
    unlockedLevel: 1,
    stars: {},
    unlockedPieces: {}
};

function getCompletedLevelsCountForZone(zoneNum, progress = userProgress) {
    const config = ZONE_PUZZLE_CONFIG[zoneNum];
    let count = 0;
    if (!progress || !progress.stars) return 0;
    config.levels.forEach(lvl => {
        if ((progress.stars[lvl] && progress.stars[lvl] > 0) || 
            (progress.stars[String(lvl)] && progress.stars[String(lvl)] > 0) || 
            (Number(progress.unlockedLevel) > Number(lvl))) {
            count++;
        }
    });
    if (progress.stars[config.bossId] && progress.stars[config.bossId] > 0) {
        count++;
    }
    return Math.min(6, count);
}

function getZoneUnlockedPieces(zoneNum = 1, progress = userProgress) {
    if (!progress) return [];
    progress.unlockedPieces = progress.unlockedPieces || {};
    let unlocked = progress.unlockedPieces[zoneNum];

    const completedCount = getCompletedLevelsCountForZone(zoneNum, progress);

    if (!Array.isArray(unlocked)) {
        unlocked = [];
    }

    const isOldSequential = unlocked.length > 1 && unlocked.every((val, idx) => val === idx + 1);

    if (unlocked.length < completedCount || isOldSequential) {
        const allPieces = [1, 2, 3, 4, 5, 6];
        if (isOldSequential) {
            unlocked = [];
        }
        const remainingLocked = allPieces.filter(p => !unlocked.includes(p));

        for (let i = remainingLocked.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingLocked[i], remainingLocked[j]] = [remainingLocked[j], remainingLocked[i]];
        }

        while (unlocked.length < completedCount && remainingLocked.length > 0) {
            unlocked.push(remainingLocked.pop());
        }

        progress.unlockedPieces[zoneNum] = unlocked;
    } else if (unlocked.length > completedCount) {
        unlocked = unlocked.slice(0, completedCount);
        progress.unlockedPieces[zoneNum] = unlocked;
    }

    return unlocked;
}

console.log("--- TEST 1: Initial state (0 levels completed) ---");
let pieces = getZoneUnlockedPieces(1, userProgress);
console.log("Unlocked pieces (should be []):", pieces);
assert.strictEqual(pieces.length, 0);

console.log("\n--- TEST 2: Complete Level 1 ---");
userProgress.stars[1] = 3;
userProgress.unlockedLevel = 2;
pieces = getZoneUnlockedPieces(1, userProgress);
console.log("Unlocked piece after Level 1 (random 1-6):", pieces);
assert.strictEqual(pieces.length, 1);

console.log("\n--- TEST 3: Complete Level 2 ---");
userProgress.stars[2] = 3;
userProgress.unlockedLevel = 3;
pieces = getZoneUnlockedPieces(1, userProgress);
console.log("Unlocked pieces after Level 2 (2 distinct random pieces):", pieces);
assert.strictEqual(pieces.length, 2);
assert.notStrictEqual(pieces[0], pieces[1]);

console.log("\n--- TEST 4: Complete Level 3 ---");
userProgress.stars[3] = 3;
userProgress.unlockedLevel = 4;
pieces = getZoneUnlockedPieces(1, userProgress);
console.log("Unlocked pieces after Level 3 (3 distinct random pieces):", pieces);
assert.strictEqual(pieces.length, 3);
assert.strictEqual(new Set(pieces).size, 3);

console.log("\n--- TEST 5: Refresh / persistence check ---");
let cached = getZoneUnlockedPieces(1, userProgress);
console.log("Re-fetching (should remain identical):", cached);
assert.deepStrictEqual(cached, pieces);

console.log("\n--- TEST 6: Complete all remaining levels (4, 5, boss-1) ---");
userProgress.stars[4] = 3;
userProgress.stars[5] = 3;
userProgress.stars["boss-1"] = 3;
userProgress.unlockedLevel = 6;
pieces = getZoneUnlockedPieces(1, userProgress);
console.log("All 6 pieces unlocked in random sequence:", pieces);
assert.strictEqual(pieces.length, 6);
assert.strictEqual(new Set(pieces).size, 6);

console.log("\n--- TEST 7: Detection & reshuffling of old sequential order [1, 2, 3] ---");
let oldProgress = {
    unlockedLevel: 4,
    stars: { 1: 3, 2: 3, 3: 3 },
    unlockedPieces: { 1: [1, 2, 3] } // old sequential order
};
let reshuffled = getZoneUnlockedPieces(1, oldProgress);
console.log("Old sequential [1, 2, 3] was reshuffled to random:", reshuffled);
assert.strictEqual(reshuffled.length, 3);

console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
