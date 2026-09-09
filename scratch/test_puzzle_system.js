const fs = require('fs');

const { ZONE_PUZZLE_CONFIG, getZonePuzzlePiecesStatus, getBuddyAvatarForProgress } = (function() {
    const ZONE_PUZZLE_CONFIG = {
        1: { zone: 1, zoneName: "Forest Realm", nextFormName: "Ice Blue AI-Buddy", nextFormAsset: "AI/ICE BLUE ROBOT.svg", bossId: "boss-1", levels: [1, 2, 3, 4, 5] },
        2: { zone: 2, zoneName: "Frozen Glacier", nextFormName: "Purple Blossom AI-Buddy", nextFormAsset: "AI/PURPLE ROBOT.svg", bossId: "boss-2", levels: [6, 7, 8, 9, 10] },
        3: { zone: 3, zoneName: "Blossom Haven", nextFormName: "Tropical Green AI-Buddy", nextFormAsset: "AI/GREEN.svg", bossId: "boss-3", levels: [11, 12, 13, 14, 15] },
        4: { zone: 4, zoneName: "Tropical Bay", nextFormName: "Golden Sands AI-Buddy", nextFormAsset: "AI/GOLD ROBOT.svg", bossId: "boss-4", levels: [16, 17, 18, 19, 20] },
        5: { zone: 5, zoneName: "Golden Sands", nextFormName: "Infernal Red AI-Buddy", nextFormAsset: "AI/RED ROBOT.svg", bossId: "boss-5", levels: [21, 22, 23, 24, 25] },
        6: { zone: 6, zoneName: "Dragon Peak", nextFormName: "Ultimate Grandmaster AI-Buddy", nextFormAsset: "AI/RED ROBOT.svg", bossId: "boss-6", levels: [26, 27, 28, 29, 30] }
    };

    function getZonePuzzlePiecesStatus(zoneNum = 1, progress) {
        const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
        const pieces = [];
        config.levels.forEach((lvlNum, idx) => {
            const isCompleted = (progress.stars && progress.stars[lvlNum] > 0) || (progress.unlockedLevel > lvlNum);
            pieces.push({ index: idx + 1, levelId: lvlNum, unlocked: Boolean(isCompleted), isBoss: false });
        });
        const isBossCompleted = Boolean(progress.stars && progress.stars[config.bossId] > 0);
        pieces.push({ index: 6, levelId: config.bossId, unlocked: isBossCompleted, isBoss: true });
        const unlockedCount = pieces.filter(p => p.unlocked).length;
        return { zone: zoneNum, config, pieces, unlockedCount, isComplete: unlockedCount === 6 };
    }

    function getBuddyAvatarForProgress(progress) {
        if (!progress) return 'AI/PNg.svg';
        if (progress.stars && progress.stars['boss-5'] > 0) return 'AI/RED ROBOT.svg';
        if (progress.stars && progress.stars['boss-4'] > 0) return 'AI/GOLD ROBOT.svg';
        if (progress.stars && progress.stars['boss-3'] > 0) return 'AI/GREEN.svg';
        if (progress.stars && progress.stars['boss-2'] > 0) return 'AI/PURPLE ROBOT.svg';
        if (progress.stars && progress.stars['boss-1'] > 0) return 'AI/ICE BLUE ROBOT.svg';
        return 'AI/PNg.svg';
    }

    return { ZONE_PUZZLE_CONFIG, getZonePuzzlePiecesStatus, getBuddyAvatarForProgress };
})();

// Simulation test
let simProgress = { unlockedLevel: 1, stars: {} };

console.log('--- Initial State (Only Level 1 Unlocked) ---');
let status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`Zone 1 Puzzle: ${status.unlockedCount}/6 parts | Evolved Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Level 1 complete
simProgress.stars[1] = 3;
simProgress.unlockedLevel = 2;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`\n[After Level 1] Puzzle: ${status.unlockedCount}/6 parts (Piece 1 unlocked) | Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Level 2 complete
simProgress.stars[2] = 3;
simProgress.unlockedLevel = 3;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`[After Level 2] Puzzle: ${status.unlockedCount}/6 parts (Piece 2 unlocked) | Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Level 3 complete
simProgress.stars[3] = 3;
simProgress.unlockedLevel = 4;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`[After Level 3] Puzzle: ${status.unlockedCount}/6 parts (Piece 3 unlocked) | Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Level 4 complete
simProgress.stars[4] = 3;
simProgress.unlockedLevel = 5;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`[After Level 4] Puzzle: ${status.unlockedCount}/6 parts (Piece 4 unlocked) | Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Level 5 complete
simProgress.stars[5] = 3;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`[After Level 5] Puzzle: ${status.unlockedCount}/6 parts (Piece 5 unlocked, Boss Pending) | Avatar: ${getBuddyAvatarForProgress(simProgress)}`);

// Boss 1 complete
simProgress.stars['boss-1'] = 3;
simProgress.unlockedLevel = 6;
status = getZonePuzzlePiecesStatus(1, simProgress);
console.log(`\n🎉 [After Boss 1 Defeated] Zone 1 Puzzle: ${status.unlockedCount}/6 parts (100% COMPLETE!) -> Evolved Avatar: ${getBuddyAvatarForProgress(simProgress)} (ICE BLUE ROBOT!)`);

// Advancing to Zone 2 (Frozen Glacier)
const z2Status = getZonePuzzlePiecesStatus(2, simProgress);
console.log(`\n--- Zone 2 (Frozen Glacier) Target: ${ZONE_PUZZLE_CONFIG[2].nextFormName} ---`);
console.log(`Zone 2 Puzzle: ${z2Status.unlockedCount}/6 parts unlocked`);
