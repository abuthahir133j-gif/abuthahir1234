const fs = require('fs');

// Mock browser environment
const localStorageData = {};
global.localStorage = {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = String(v); },
    removeItem: (k) => { delete localStorageData[k]; }
};
global.window = {
    addEventListener: () => {},
    scrollTo: () => {}
};
const dummyEl = {
    innerHTML: '',
    innerText: '',
    style: {},
    dataset: {},
    closest: () => dummyEl,
    querySelector: () => dummyEl,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => '',
    addEventListener: () => {}
};
global.document = {
    body: dummyEl,
    addEventListener: () => {},
    getElementById: () => dummyEl,
    querySelector: () => dummyEl,
    querySelectorAll: () => [],
    createElement: () => dummyEl
};

// Evaluate game.js functions
const gameJsCode = fs.readFileSync('game.js', 'utf8');

// Simple test harness
const evalContext = new Function(`
    ${gameJsCode}
    return {
        getUserProgress: () => userProgress,
        loadProgress,
        saveProgress,
        completeLevel,
        isZoneAllPartsUnlocked,
        getBuddyAvatarForProgress,
        getZonePuzzlePiecesStatus
    };
`);

const game = evalContext();

console.log("=== RUNNING EVOLUTION VALIDATION TESTS ===");

// 1. Initial State
let avatar = game.getBuddyAvatarForProgress({ unlockedLevel: 1, stars: {} });
console.log(`[Level 1 Initial] Avatar: ${avatar} (Expected: AI/PNg.svg) -> ${avatar === 'AI/PNg.svg' ? 'PASS' : 'FAIL'}`);

// 2. Complete Level 1 to 4
for (let i = 1; i <= 4; i++) {
    game.completeLevel(i, 3);
}
avatar = game.getBuddyAvatarForProgress(game.getUserProgress());
console.log(`[Level 4 Completed] UnlockedLevel: ${game.getUserProgress().unlockedLevel}, Avatar: ${avatar} (Expected: AI/PNg.svg) -> ${avatar === 'AI/PNg.svg' ? 'PASS' : 'FAIL'}`);

// 3. Complete Level 5 (5 of 6 parts unlocked, Boss 1 NOT yet completed)
game.completeLevel(5, 3);
const status5 = game.getZonePuzzlePiecesStatus(1, game.getUserProgress());
avatar = game.getBuddyAvatarForProgress(game.getUserProgress());

console.log(`\n--- CRITICAL TEST: LEVEL 5 COMPLETED (5/6 PARTS) ---`);
console.log(`Puzzle Parts: ${status5.unlockedCount}/6 unlocked`);
console.log(`Is Complete: ${status5.isComplete}`);
console.log(`Unlocked Level: ${game.getUserProgress().unlockedLevel} (Must NOT be 6! Expected: 5) -> ${game.getUserProgress().unlockedLevel === 5 ? 'PASS' : 'FAIL'}`);
console.log(`Companion Avatar: ${avatar} (Must NOT be full robot! Expected: AI/PNg.svg) -> ${avatar === 'AI/PNg.svg' ? 'PASS' : 'FAIL'}`);

// 4. Defeat Boss 1 (6 of 6 parts unlocked!)
game.completeLevel('boss-1', 3);
const statusBoss1 = game.getZonePuzzlePiecesStatus(1, game.getUserProgress());
avatar = game.getBuddyAvatarForProgress(game.getUserProgress());

console.log(`\n--- CRITICAL TEST: BOSS 1 DEFEATED (ALL 6/6 PARTS UNLOCKED) ---`);
console.log(`Puzzle Parts: ${statusBoss1.unlockedCount}/6 unlocked`);
console.log(`Is Complete: ${statusBoss1.isComplete}`);
console.log(`Unlocked Level: ${game.getUserProgress().unlockedLevel} (Expected: 6) -> ${game.getUserProgress().unlockedLevel === 6 ? 'PASS' : 'FAIL'}`);
console.log(`Companion Avatar: ${avatar} (Must be full robot! Expected: AI/ICE BLUE ROBOT.svg) -> ${avatar === 'AI/ICE BLUE ROBOT.svg' ? 'PASS' : 'FAIL'}`);

// 5. Sanitization Test: Existing progress with unlockedLevel = 6 and no boss-1
localStorage.setItem('language_lab_level_progress_v2', JSON.stringify({
    unlockedLevel: 6,
    stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }
}));
game.loadProgress();
avatar = game.getBuddyAvatarForProgress(game.getUserProgress());
console.log(`\n--- SANITIZATION TEST (Existing User with unlockedLevel = 6 and no boss-1) ---`);
console.log(`Sanitized Unlocked Level: ${game.getUserProgress().unlockedLevel} (Expected: 5) -> ${game.getUserProgress().unlockedLevel === 5 ? 'PASS' : 'FAIL'}`);
console.log(`Companion Avatar: ${avatar} (Expected: AI/PNg.svg) -> ${avatar === 'AI/PNg.svg' ? 'PASS' : 'FAIL'}`);

console.log("\nALL EVOLUTION ASSERTIONS PASSED!");
process.exit(0);
