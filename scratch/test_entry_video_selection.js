const assert = require('assert');

function getDynamicEntryVideo(progress) {
    if (!progress) return { name: "Entry.mp4", path: "AI/video/Entry.mp4" };
    const unLvl = Number(progress.unlockedLevel) || 1;
    const stars = progress.stars || {};

    // Zone 6: Level 26 to 30 / Boss 6
    if (unLvl >= 26 || (stars["boss-5"] && stars["boss-5"] > 0)) {
        return { name: "Entry 5.mp4", path: "AI/video/Entry 5.mp4" };
    }
    // Zone 5: Level 21 to 25 / Boss 5
    if (unLvl >= 21 || (stars["boss-4"] && stars["boss-4"] > 0)) {
        return { name: "Entry 4.mp4", path: "AI/video/Entry 4.mp4" };
    }
    // Zone 4: Level 16 to 20 / Boss 4
    if (unLvl >= 16 || (stars["boss-3"] && stars["boss-3"] > 0)) {
        return { name: "Entry 3.mp4", path: "AI/video/Entry 3.mp4" };
    }
    // Zone 3: Level 11 to 15 / Boss 3
    if (unLvl >= 11 || (stars["boss-2"] && stars["boss-2"] > 0)) {
        return { name: "Entry 2.mp4", path: "AI/video/Entry 2.mp4" };
    }
    // Zone 2: Level 6 to 10 / Boss 2
    if (unLvl >= 6 || (stars["boss-1"] && stars["boss-1"] > 0)) {
        return { name: "Entry 1.mp4", path: "AI/video/Entry 1.mp4" };
    }
    // Zone 1: Level 1 to 5 / Boss 1
    return { name: "Entry.mp4", path: "AI/video/Entry.mp4" };
}

// Test cases:
console.log("TEST 1: Level 1 ->", getDynamicEntryVideo({ unlockedLevel: 1, stars: {} }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 1, stars: {} }).name, "Entry.mp4");

console.log("TEST 2: Level 5 ->", getDynamicEntryVideo({ unlockedLevel: 5, stars: {} }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 5, stars: {} }).name, "Entry.mp4");

console.log("TEST 3: Level 6 / Boss 1 defeated ->", getDynamicEntryVideo({ unlockedLevel: 6, stars: { "boss-1": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 6, stars: { "boss-1": 3 } }).name, "Entry 1.mp4");

console.log("TEST 4: Level 10 ->", getDynamicEntryVideo({ unlockedLevel: 10, stars: { "boss-1": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 10, stars: { "boss-1": 3 } }).name, "Entry 1.mp4");

console.log("TEST 5: Level 11 / Boss 2 defeated ->", getDynamicEntryVideo({ unlockedLevel: 11, stars: { "boss-2": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 11, stars: { "boss-2": 3 } }).name, "Entry 2.mp4");

console.log("TEST 6: Level 16 / Boss 3 defeated ->", getDynamicEntryVideo({ unlockedLevel: 16, stars: { "boss-3": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 16, stars: { "boss-3": 3 } }).name, "Entry 3.mp4");

console.log("TEST 7: Level 21 / Boss 4 defeated ->", getDynamicEntryVideo({ unlockedLevel: 21, stars: { "boss-4": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 21, stars: { "boss-4": 3 } }).name, "Entry 4.mp4");

console.log("TEST 8: Level 26 / Boss 5 defeated ->", getDynamicEntryVideo({ unlockedLevel: 26, stars: { "boss-5": 3 } }).name);
assert.strictEqual(getDynamicEntryVideo({ unlockedLevel: 26, stars: { "boss-5": 3 } }).name, "Entry 5.mp4");

console.log("\n>>> ALL PROGRESSION VIDEO TESTS PASSED! <<<");
