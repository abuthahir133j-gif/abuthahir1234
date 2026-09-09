// ==========================================
// Language Lab - Level Map Data & State Engine
// ==========================================

// 30 Sequentially Progressing Regular Levels (5 Levels per Realm Zone)
const LEVEL_NODES = [
    // Zone 1: Forest Realm (Levels 1-5)
    { id: 1, zone: 1, zoneName: "Forest Realm", title: "Gate of Beginnings", desc: "Begin your language journey at the ancient forest gate.", x: 4.8, y: 82, img: "Level/level 1.png" },
    { id: 2, zone: 1, zoneName: "Forest Realm", title: "Whispering Woods", desc: "Navigate the winding paths through the green canopy.", x: 8.2, y: 70, img: "Level/level 2.png" },
    { id: 3, zone: 1, zoneName: "Forest Realm", title: "Waterfall Crossing", desc: "Cross the wooden bridge over the rushing forest waterfall.", x: 12, y: 60, img: "Level/level 3.png" },
    { id: 4, zone: 1, zoneName: "Forest Realm", title: "Ancient Tree Sanctuary", desc: "Discover hidden words beneath the great ancient tree.", x: 15.9, y: 53, img: "Level/level 4.png" },
    { id: 5, zone: 1, zoneName: "Forest Realm", title: "Emerald Archway", desc: "Unlock the magical archway leading toward the snowy peaks.", x: 17.5, y: 38, img: "Level/level 5.png" },

    // Zone 2: Frozen Glacier (Levels 6-10) - Level 6 is the first Ice Zone level on the bridge
    { id: 6, zone: 2, zoneName: "Frozen Glacier", title: "Frostbite Bridge", desc: "Cross the icy stone bridge into the snowbound kingdom.", x: 20.6, y: 38, img: "Level/level 6.png" },
    { id: 7, zone: 2, zoneName: "Frozen Glacier", title: "Crystal Cavern", desc: "Explore glowing blue ice crystals and master new terms.", x: 23.5, y: 45.5, img: "Level/level 7.png" },
    { id: 8, zone: 2, zoneName: "Frozen Glacier", title: "Snowy Village Plaza", desc: "Solve challenges in the heart of the snow village.", x: 26.3, y: 56, img: "Level/level 8.png" },
    { id: 9, zone: 2, zoneName: "Frozen Glacier", title: "Ice Citadel Gate", desc: "Conquer the frozen gate to reach the cherry blossom valley.", x: 28, y: 70, img: "Level/level 9.png" },
    { id: 10, zone: 2, zoneName: "Frozen Glacier", title: "Glacier Pass", desc: "Pass through the snowy mountain pass into the blooming valley.", x: 31, y: 79, img: "Level/level 10.png" },

    // Zone 3: Blossom Haven (Levels 11-15)
    { id: 11, zone: 3, zoneName: "Blossom Haven", title: "Blossom Pathway", desc: "Walk through pink petals along the winding spring road.", x: 37, y: 87, img: "Level/level 11.png" },
    { id: 12, zone: 3, zoneName: "Blossom Haven", title: "Windmill Fields", desc: "Solve grammar puzzles near the turning windmills.", x: 42.2, y: 80.2, img: "Level/level 12.png" },
    { id: 13, zone: 3, zoneName: "Blossom Haven", title: "Spring Palace Gardens", desc: "Gather flower tokens in the royal palace gardens.", x: 44.9, y: 65, img: "Level/level 13.png" },
    { id: 14, zone: 3, zoneName: "Blossom Haven", title: "Floating Island Vista", desc: "Look out over the valley from the enchanted floral cliff.", x: 48.6, y: 60, img: "Level/level 14.png" },
    { id: 15, zone: 3, zoneName: "Blossom Haven", title: "Portal of Renewal", desc: "Unlock the glowing floral portal into tropical waters.", x: 52, y: 49.5, img: "Level/level 15.png" },

    // Zone 4: Tropical Bay (Levels 16-20)
    { id: 16, zone: 4, zoneName: "Tropical Bay", title: "Azure Shoreline", desc: "Land on sunny shores and begin water-themed exercises.", x: 55.5, y: 33, img: "Level/level 16.png" },
    { id: 17, zone: 4, zoneName: "Tropical Bay", title: "Waterfall Lagoon", desc: "Dive into vocabulary puzzles around the cascading lagoon.", x: 58.4, y: 50, img: "Level/level 17.png" },
    { id: 18, zone: 4, zoneName: "Tropical Bay", title: "Sea Temple Ruins", desc: "Unlock ancient ruins submerged in crystal clear ocean water.", x: 61.8, y: 43, img: "Level/level 18.png" },
    { id: 19, zone: 4, zoneName: "Tropical Bay", title: "Coral Pier", desc: "Master dialogue on the wooden pier connecting island huts.", x: 61.5, y: 58, img: "Level/level 19.png" },
    { id: 20, zone: 4, zoneName: "Tropical Bay", title: "Desert Canyon Bridge", desc: "Cross the bridge connecting tropical waters to arid sands.", x: 63.8, y: 66.5, img: "Level/level 20.png" },

    // Zone 5: Golden Sands (Levels 21-25)
    { id: 21, zone: 5, zoneName: "Golden Sands", title: "Dune Oasis", desc: "Rest at the desert oasis while solving sentence building tasks.", x: 69.6, y: 74, img: "Level/level 21.png" },
    { id: 22, zone: 5, zoneName: "Golden Sands", title: "Sunken Pyramid", desc: "Uncover hieroglyphic vocabulary inside the ancient pyramid.", x: 74.8, y: 72, img: "Level/level 22.png" },
    { id: 23, zone: 5, zoneName: "Golden Sands", title: "Canyon Overlook", desc: "Navigate narrow desert cliff paths high above the canyon floor.", x: 79.2, y: 79, img: "Level/level 23.png" },
    { id: 24, zone: 5, zoneName: "Golden Sands", title: "Red Rock Pass", desc: "Survive the scorching sun puzzles leading toward lava lands.", x: 79, y: 60, img: "Level/level 24.png" },
    { id: 25, zone: 5, zoneName: "Golden Sands", title: "Gates of Obsidian", desc: "Unlock the heavy iron gates entering the volcanic realm.", x: 78.5, y: 44, img: "Level/level 25.png" },

    // Zone 6: Dragon Peak (Levels 26-30)
    { id: 26, zone: 6, zoneName: "Dragon Peak", title: "Magma River", desc: "Cross stone stepping blocks over flowing rivers of lava.", x: 86.7, y: 48, img: "Level/level 26.png" },
    { id: 27, zone: 6, zoneName: "Dragon Peak", title: "Brimstone Fortress", desc: "Infiltrate the dark stone fortress built into molten rock.", x: 83.7, y: 72, img: "Level/level 27.png" },
    { id: 28, zone: 6, zoneName: "Dragon Peak", title: "Inferno Ridge", desc: "Ascend the steep volcanic ridge under glowing ember skies.", x: 89.5, y: 56, img: "Level/level 28.png" },
    { id: 29, zone: 6, zoneName: "Dragon Peak", title: "Dragon's Staircase", desc: "Climb the winding staircase guarded by fiery gargoyles.", x: 96, y: 53, img: "Level/level 29.png" },
    { id: 30, zone: 6, zoneName: "Dragon Peak", title: "Dragon Citadel Final Boss", desc: "Face the ultimate language challenge atop Dragon's Citadel!", x: 94.5, y: 40.5, img: "Level/level 30.png" }
];

// 6 Separate Zone Boss Challenges (Separated from regular level sequence)
const BOSS_NODES = [
    { id: "boss-1", bossIndex: 1, isBoss: true, zone: 1, zoneName: "Forest Realm", title: "Forest Guardian Boss", desc: "Face the ancient forest titan to prove your mastery of Zone 1!", x: 9.5, y: 28, img: "Level/goldboss.png", requiredLevels: [1, 2, 3, 4, 5] },
    { id: "boss-2", bossIndex: 2, isBoss: true, zone: 2, zoneName: "Frozen Glacier", title: "Frost Golem Boss", desc: "Battle the frozen colossus atop the glacial peaks of Zone 2!", x: 30.7, y: 30, img: "Level/iceboss.png", requiredLevels: [6, 7, 8, 9, 10] },
    { id: "boss-3", bossIndex: 3, isBoss: true, zone: 3, zoneName: "Blossom Haven", title: "Cherry Blossom Spirit Boss", desc: "Challenge the guardian of the sacred petals in Zone 3!", x: 49.5, y: 35, img: "Level/springboss.png", requiredLevels: [11, 12, 13, 14, 15] },
    { id: "boss-4", bossIndex: 4, isBoss: true, zone: 4, zoneName: "Tropical Bay", title: "Kraken Leviathan Boss", desc: "Conquer the ruler of the ocean depths in Zone 4!", x: 67.5, y: 37, img: "Level/waterboss.png", requiredLevels: [16, 17, 18, 19, 20] },
    { id: "boss-5", bossIndex: 5, isBoss: true, zone: 5, zoneName: "Golden Sands", title: "Pharaoh Sand Drake Boss", desc: "Defeat the ancient sand titan of the desert pyramid in Zone 5!", x: 75.5, y: 32, img: "Level/desertboss.png", requiredLevels: [21, 22, 23, 24, 25] },
    { id: "boss-6", bossIndex: 6, isBoss: true, zone: 6, zoneName: "Dragon Peak", title: "Infernal Dragon Lord Boss", desc: "Defeat the ultimate volcanic dragon atop Dragon Citadel!", x: 97.5, y: 30.5, img: "Level/lava boss.png", requiredLevels: [26, 27, 28, 29, 30] }
];

// ==========================================
// Level Experience Packages Configuration
// ==========================================
// Boss levels MUST open Assessent_v5
// Remaining 8 packages open across regular levels from language-lab-engine/src/runtime/samples
const BOSS_EXPERIENCE_PACKAGE = "Assessent_v5";
const REGULAR_EXPERIENCE_PACKAGES = [
    { id: "Hello!_This_Is_Me..._v1", title: "Hello! This Is Me" },
    { id: "Things_I_Like_v6", title: "Things I Like" },
    { id: "Meet_My_Friends_v8", title: "Meet My Friends" },
    { id: "This_Is_My_Family_v7", title: "This Is My Family" },
    { id: "Welcome_to_My_Classroom_v3", title: "Welcome to My Classroom" },
    { id: "Where_Is_My_Pencil__v2", title: "Where Is My Pencil?" },
    { id: "What's_in_My_School_Bag__v4", title: "What's in My School Bag?" },
    { id: "Can_You_Help_Me__v1", title: "Can You Help Me?" }
];

function getLevelExperiencePackage(levelId, isBoss = false) {
    const isBossLevel = Boolean(
        isBoss || 
        String(levelId).startsWith("boss-") || 
        levelId === 30 || 
        levelId === "30"
    );
    if (isBossLevel) {
        return {
            packageId: BOSS_EXPERIENCE_PACKAGE,
            title: "Assessment Challenge",
            isBoss: true
        };
    }
    const num = parseInt(levelId, 10);
    const validNum = (!isNaN(num) && num >= 1) ? num : 1;
    const pkg = REGULAR_EXPERIENCE_PACKAGES[(validNum - 1) % REGULAR_EXPERIENCE_PACKAGES.length];
    return {
        packageId: pkg.id,
        title: pkg.title,
        isBoss: false
    };
}
window.getLevelExperiencePackage = getLevelExperiencePackage;

// App State Management
const STORAGE_KEY = "language_lab_level_progress_v2";
let userProgress = {
    unlockedLevel: 1,
    stars: {},
    playedBossAnimations: {}
};

// AI Buddy Seasonal Avatar Evolution Configuration
const BUDDY_SEASON_AVATARS = {
    zone1: { zone: 1, name: "Forest Realm AI", asset: "AI/PNg.svg", title: "Forest AI Buddy", desc: "Classic companion for the Forest Realm." },
    zone2: { zone: 2, name: "Frozen Glacier AI", asset: "AI/ICE BLUE ROBOT.svg", title: "Ice Blue AI Buddy", desc: "Evolved companion from completing Forest Realm Boss!" },
    zone3: { zone: 3, name: "Blossom Haven AI", asset: "AI/PURPLE ROBOT.svg", title: "Purple AI Buddy", desc: "Evolved companion from completing Frozen Glacier Boss!" },
    zone4: { zone: 4, name: "Tropical Bay AI", asset: "AI/GREEN.svg", title: "Green AI Buddy", desc: "Evolved companion from completing Blossom Haven Boss!" },
    zone5: { zone: 5, name: "Golden Sands AI", asset: "AI/GOLD ROBOT.svg", title: "Gold AI Buddy", desc: "Evolved companion from completing Tropical Bay Boss!" },
    zone6: { zone: 6, name: "Dragon Peak AI", asset: "AI/RED ROBOT.svg", title: "Red AI Buddy", desc: "Ultimate volcanic companion from Golden Sands Boss!" }
};

// ==========================================================================
// AI-BUDDY SEASON EVOLUTION PUZZLE ASSEMBLY SYSTEM (6-PART JIGSAW)
// ==========================================================================
const ZONE_PUZZLE_CONFIG = {
    1: {
        zone: 1,
        zoneName: "Forest Realm",
        nextFormName: "Ice Blue AI-Buddy",
        nextFormAsset: "AI/ICE BLUE ROBOT.svg",
        themeColor: "#38bdf8",
        bossId: "boss-1",
        levels: [1, 2, 3, 4, 5],
        desc: "Assemble all 6 pieces of the Ice Blue Guardian to evolve your AI-Buddy for Frozen Glacier!"
    },
    2: {
        zone: 2,
        zoneName: "Frozen Glacier",
        nextFormName: "Purple Blossom AI-Buddy",
        nextFormAsset: "AI/PURPLE ROBOT.svg",
        themeColor: "#c084fc",
        bossId: "boss-2",
        levels: [6, 7, 8, 9, 10],
        desc: "Assemble all 6 pieces of the Blossom Spirit to evolve your AI-Buddy for Blossom Haven!"
    },
    3: {
        zone: 3,
        zoneName: "Blossom Haven",
        nextFormName: "Tropical Green AI-Buddy",
        nextFormAsset: "AI/GREEN.svg",
        themeColor: "#34d399",
        bossId: "boss-3",
        levels: [11, 12, 13, 14, 15],
        desc: "Assemble all 6 pieces of the Ocean Explorer to evolve your AI-Buddy for Tropical Bay!"
    },
    4: {
        zone: 4,
        zoneName: "Tropical Bay",
        nextFormName: "Golden Sands AI-Buddy",
        nextFormAsset: "AI/GOLD ROBOT.svg",
        themeColor: "#fbbf24",
        bossId: "boss-4",
        levels: [16, 17, 18, 19, 20],
        desc: "Assemble all 6 pieces of the Pharaoh Titan to evolve your AI-Buddy for Golden Sands!"
    },
    5: {
        zone: 5,
        zoneName: "Golden Sands",
        nextFormName: "Infernal Red AI-Buddy",
        nextFormAsset: "AI/RED ROBOT.svg",
        themeColor: "#f87171",
        bossId: "boss-5",
        levels: [21, 22, 23, 24, 25],
        desc: "Assemble all 6 pieces of the Dragon Master to evolve your AI-Buddy for Dragon Peak!"
    },
    6: {
        zone: 6,
        zoneName: "Dragon Peak",
        nextFormName: "Ultimate Grandmaster AI-Buddy",
        nextFormAsset: "AI/RED ROBOT.svg",
        themeColor: "#f59e0b",
        bossId: "boss-6",
        levels: [26, 27, 28, 29, 30],
        desc: "Assemble all 6 pieces of the Infernal Dragon Lord to complete the ultimate language master collection!"
    }
};

function isAllPartsCompleted(zoneNum = 1, progress = userProgress) {
    if (!progress) return false;
    const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
    
    // Boss level MUST be completed to unlock the final core part and assemble the robot!
    const isBossDefeated = Boolean(progress.stars && progress.stars[config.bossId] && progress.stars[config.bossId] > 0);
    if (!isBossDefeated) {
        return false;
    }

    // All regular levels 1-5 must also be completed
    let regularLevelsCompleted = 0;
    if (progress.stars) {
        config.levels.forEach(lvl => {
            if ((progress.stars[lvl] && progress.stars[lvl] > 0) || 
                (progress.stars[String(lvl)] && progress.stars[String(lvl)] > 0) || 
                (Number(progress.unlockedLevel) > Number(lvl))) {
                regularLevelsCompleted++;
            }
        });
    }

    if (regularLevelsCompleted < config.levels.length) {
        return false;
    }

    return true;
}

function isZoneAllPartsUnlocked(zoneNum, progress = userProgress) {
    if (!progress) return false;
    return isAllPartsCompleted(zoneNum, progress);
}

function getBuddyAvatarForProgress(progress = userProgress) {
    if (!progress) return "AI/PNg.svg";
    
    // Companion evolves into full robot form ONLY when Boss of that zone is defeated (ALL parts complete)!
    if (isZoneAllPartsUnlocked(5, progress) && (progress.stars && progress.stars["boss-5"] > 0)) {
        return "AI/RED ROBOT.svg";
    }
    if (isZoneAllPartsUnlocked(4, progress) && (progress.stars && progress.stars["boss-4"] > 0)) {
        return "AI/GOLD ROBOT.svg";
    }
    if (isZoneAllPartsUnlocked(3, progress) && (progress.stars && progress.stars["boss-3"] > 0)) {
        return "AI/GREEN.svg";
    }
    if (isZoneAllPartsUnlocked(2, progress) && (progress.stars && progress.stars["boss-2"] > 0)) {
        return "AI/PURPLE ROBOT.svg";
    }
    if (isZoneAllPartsUnlocked(1, progress) && (progress.stars && progress.stars["boss-1"] > 0)) {
        return "AI/ICE BLUE ROBOT.svg";
    }
    
    // Zone 1 Default (while Boss 1 has not yet been defeated / Part 6 is still locked)
    return "AI/PNg.svg";
}

function getBuddyAvatarInfo(progress = userProgress) {
    const asset = getBuddyAvatarForProgress(progress);
    for (const key of Object.keys(BUDDY_SEASON_AVATARS)) {
        if (BUDDY_SEASON_AVATARS[key].asset === asset) {
            return BUDDY_SEASON_AVATARS[key];
        }
    }
    return BUDDY_SEASON_AVATARS.zone1;
}

function updateBuddyAvatar() {
    const avatarAsset = getBuddyAvatarForProgress(userProgress);
    const avatarInfo = getBuddyAvatarInfo(userProgress);

    // 1. Update HUD Robot avatar button
    const hudRobotImg = document.querySelector("#hud-robot-btn img") || document.getElementById("hud-robot-avatar-img");
    if (hudRobotImg) {
        if (hudRobotImg.getAttribute("src") !== avatarAsset) {
            hudRobotImg.src = avatarAsset;
        }
    }

    // 2. Update Robot dropdown companion info
    const robotHeader = document.querySelector("#robot-dropdown .robot-header span");
    if (robotHeader) {
        robotHeader.innerText = `🤖 ${avatarInfo.title}`;
    }
    const robotBody = document.querySelector("#robot-dropdown .robot-body p");
    if (robotBody) {
        robotBody.innerText = `Hello! I am your ${avatarInfo.title}. ${avatarInfo.desc} Defeat realm bosses to evolve my form across all 6 zones!`;
    }

    // 3. Update TravelBuddy if mounted
    if (window.travelBuddy && typeof window.travelBuddy.setCharacterAsset === "function") {
        window.travelBuddy.setCharacterAsset(avatarAsset);
    }
}
window.BUDDY_SEASON_AVATARS = BUDDY_SEASON_AVATARS;
window.ZONE_PUZZLE_CONFIG = ZONE_PUZZLE_CONFIG;
window.isZoneAllPartsUnlocked = isZoneAllPartsUnlocked;
window.getBuddyAvatarForProgress = getBuddyAvatarForProgress;
window.getBuddyAvatarInfo = getBuddyAvatarInfo;
window.updateBuddyAvatar = updateBuddyAvatar;

function getCurrentZonePuzzle(progress = userProgress) {
    const unLvl = progress.unlockedLevel || 1;
    if (unLvl <= 5 || (!progress.stars?.["boss-1"] || progress.stars["boss-1"] <= 0)) return ZONE_PUZZLE_CONFIG[1];
    if (unLvl <= 10 || (!progress.stars?.["boss-2"] || progress.stars["boss-2"] <= 0)) return ZONE_PUZZLE_CONFIG[2];
    if (unLvl <= 15 || (!progress.stars?.["boss-3"] || progress.stars["boss-3"] <= 0)) return ZONE_PUZZLE_CONFIG[3];
    if (unLvl <= 20 || (!progress.stars?.["boss-4"] || progress.stars["boss-4"] <= 0)) return ZONE_PUZZLE_CONFIG[4];
    if (unLvl <= 25 || (!progress.stars?.["boss-5"] || progress.stars["boss-5"] <= 0)) return ZONE_PUZZLE_CONFIG[5];
    return ZONE_PUZZLE_CONFIG[6];
}

function getCompletedLevelsCountForZone(zoneNum, progress = userProgress) {
    const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
    let count = 0;
    if (!progress || !progress.stars) return 0;
    // Check regular levels (1 to 5)
    config.levels.forEach(lvl => {
        if ((progress.stars[lvl] && progress.stars[lvl] > 0) || 
            (progress.stars[String(lvl)] && progress.stars[String(lvl)] > 0) || 
            (Number(progress.unlockedLevel) > Number(lvl))) {
            count++;
        }
    });
    // Check boss level (6th part) - ONLY increments when boss is defeated!
    if (progress.stars[config.bossId] && progress.stars[config.bossId] > 0) {
        count++;
    }
    return Math.min(6, count);
}

function getZoneUnlockedPieces(zoneNum = 1, progress = userProgress) {
    if (!progress) return [];
    const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
    progress.unlockedPieces = progress.unlockedPieces || {};

    const unlocked = [];

    // Regular levels 1-5 unlock parts 1-5
    config.levels.forEach((lvl, idx) => {
        const isLvlComplete = (progress.stars && progress.stars[lvl] > 0) || 
                             (progress.stars && progress.stars[String(lvl)] > 0) || 
                             (Number(progress.unlockedLevel) > Number(lvl));
        if (isLvlComplete) {
            unlocked.push(idx + 1);
        }
    });

    // Part 6 (Final Part / Boss Core) ONLY unlocks when the boss level is completed!
    const isBossDefeated = Boolean(progress.stars && progress.stars[config.bossId] && progress.stars[config.bossId] > 0);
    if (isBossDefeated) {
        unlocked.push(6);
    }

    progress.unlockedPieces[zoneNum] = unlocked;
    return unlocked;
}

function getZonePuzzlePiecesStatus(zoneNum = 1, progress = userProgress) {
    const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
    const unlockedPieceIndices = getZoneUnlockedPieces(zoneNum, progress);
    const pieces = [];
    
    for (let i = 1; i <= 6; i++) {
        const isPieceUnlocked = unlockedPieceIndices.includes(i);
        const isBossPiece = (i === 6);
        pieces.push({
            index: i,
            levelId: isBossPiece ? config.bossId : config.levels[i - 1],
            levelTitle: isBossPiece ? `${config.zoneName} Boss Core` : `Part ${i}`,
            unlocked: isPieceUnlocked,
            isBoss: isBossPiece
        });
    }

    const unlockedCount = pieces.filter(p => p.unlocked).length;
    return {
        zone: zoneNum,
        config: config,
        pieces: pieces,
        unlockedCount: unlockedCount,
        totalCount: 6,
        isComplete: isAllPartsCompleted(zoneNum, progress)
    };
}

let activeAssemblyTimer = null;

function renderBuddyPuzzleModal(targetZone = null, justUnlockedPieceIndex = null) {
    const currentZoneConfig = targetZone ? (ZONE_PUZZLE_CONFIG[targetZone] || ZONE_PUZZLE_CONFIG[1]) : getCurrentZonePuzzle(userProgress);
    const puzzleStatus = getZonePuzzlePiecesStatus(currentZoneConfig.zone, userProgress);
    const allCompleted = isAllPartsCompleted(currentZoneConfig.zone, userProgress);
    updateBuddyAvatar();

    // Update Zone Tag Badge (e.g. ZONE 1 • FOREST REALM)
    const zoneTagEl = document.getElementById("puzzle-zone-tag");
    if (zoneTagEl) {
        zoneTagEl.innerText = `ZONE ${currentZoneConfig.zone} • ${currentZoneConfig.zoneName.toUpperCase()}`;
    }

    // Update Header Elements
    const titleEl = document.getElementById("puzzle-title");
    if (titleEl) titleEl.innerText = currentZoneConfig.nextFormName;

    const subtitleEl = document.getElementById("puzzle-subtitle");
    if (subtitleEl) subtitleEl.innerText = currentZoneConfig.desc;

    // Board styling & Background Blueprint
    const boardEl = document.getElementById("puzzle-board");
    const bgSilhouette = document.getElementById("puzzle-blueprint-bg");
    if (bgSilhouette) {
        bgSilhouette.style.backgroundImage = `url("${currentZoneConfig.nextFormAsset}")`;
    }

    // Render Slots (matching First Image design)
    puzzleStatus.pieces.forEach(piece => {
        const slotEl = document.querySelector(`.slot-${piece.index}`);
        if (!slotEl) return;

        const imgCropEl = slotEl.querySelector(".puzzle-piece-img-crop, .cr-piece-crop");
        if (imgCropEl) {
            imgCropEl.style.backgroundImage = `url("${currentZoneConfig.nextFormAsset}")`;
        }

        slotEl.classList.remove("locked", "unlocked", "just-unlocked", "highlighted", "piece-assembling");

        const lvlTag = slotEl.querySelector(".slot-lvl-tag, .cr-lock-lvl");

        if (piece.unlocked) {
            slotEl.classList.add("unlocked");
            if (justUnlockedPieceIndex === piece.index || (justUnlockedPieceIndex === null && puzzleStatus.unlockedCount === 1 && piece.unlocked)) {
                slotEl.classList.add("just-unlocked", "highlighted");
            }
        } else {
            slotEl.classList.add("locked");
            if (lvlTag) {
                lvlTag.innerText = piece.isBoss ? "Boss Core" : "Locked";
            }
        }
    });

    const bannerEl = document.getElementById("puzzle-evolution-banner");
    const glowEl = document.getElementById("puzzle-fusion-glow");
    const evoDescEl = document.getElementById("puzzle-evolution-desc");
    const evoTitleEl = bannerEl?.querySelector(".evo-title");
    const seamFlashEl = document.getElementById("puzzle-seam-flash");
    const emoteOverlayEl = document.getElementById("puzzle-robot-emote-overlay");

    if (allCompleted) {
        // Check if assembly sequence was already played and persisted
        const isAlreadyPlayed = Boolean(userProgress.assemblyPlayed && userProgress.assemblyPlayed[currentZoneConfig.zone]);
        
        if (isAlreadyPlayed) {
            // STEP 5 / Final State directly: show complete robot without replaying
            if (boardEl) {
                boardEl.classList.remove("assembling", "robot-welcome-emote");
                boardEl.classList.add("assembled", "idle-ready");
            }
            if (seamFlashEl) seamFlashEl.classList.remove("flash-active");
            if (emoteOverlayEl) emoteOverlayEl.classList.add("hidden");
            if (glowEl) glowEl.classList.add("hidden");
            if (bannerEl) {
                bannerEl.classList.remove("hidden");
                if (evoTitleEl) evoTitleEl.innerText = "ROBOT FULLY ASSEMBLED";
                if (evoDescEl) evoDescEl.innerText = `All parts completed — ${currentZoneConfig.nextFormName} ready!`;
            }
        } else {
            // Newly complete transition: Trigger cinematic assembly sequence
            runCinematicAssemblySequence(currentZoneConfig, puzzleStatus);
        }
    } else {
        // Not all completed: standard locked/unlocked grid view
        if (boardEl) {
            boardEl.classList.remove("assembled", "assembling", "idle-ready", "robot-welcome-emote");
        }
        if (bannerEl) bannerEl.classList.add("hidden");
        if (glowEl) glowEl.classList.add("hidden");
        if (seamFlashEl) seamFlashEl.classList.remove("flash-active");
        if (emoteOverlayEl) emoteOverlayEl.classList.add("hidden");
    }
}

// Cinematic Final Robot Assembly + Welcome Emote Sequence
function runCinematicAssemblySequence(currentZoneConfig, puzzleStatus) {
    const boardEl = document.getElementById("puzzle-board");
    const bannerEl = document.getElementById("puzzle-evolution-banner");
    const glowEl = document.getElementById("puzzle-fusion-glow");
    const seamFlashEl = document.getElementById("puzzle-seam-flash");
    const emoteOverlayEl = document.getElementById("puzzle-robot-emote-overlay");
    const evoTitleEl = bannerEl?.querySelector(".evo-title");
    const evoDescEl = document.getElementById("puzzle-evolution-desc");
    const zoneNum = currentZoneConfig.zone;

    if (!boardEl) return;

    if (activeAssemblyTimer) {
        clearTimeout(activeAssemblyTimer);
        activeAssemblyTimer = null;
    }

    // Check persistence: if already played, display completed robot directly
    if (userProgress.assemblyPlayed && userProgress.assemblyPlayed[zoneNum]) {
        boardEl.classList.remove("assembling", "robot-welcome-emote");
        boardEl.classList.add("assembled", "idle-ready");
        document.querySelectorAll(".cr-slot, .puzzle-slot").forEach(s => s.classList.remove("piece-assembling", "highlighted", "just-unlocked"));
        if (seamFlashEl) seamFlashEl.classList.remove("flash-active");
        if (emoteOverlayEl) emoteOverlayEl.classList.add("hidden");
        if (glowEl) glowEl.classList.add("hidden");
        if (bannerEl) {
            bannerEl.classList.remove("hidden");
            if (evoTitleEl) evoTitleEl.innerText = "ROBOT FULLY ASSEMBLED";
            if (evoDescEl) evoDescEl.innerText = `All parts completed — ${currentZoneConfig.nextFormName} ready!`;
        }
        return;
    }

    // STEP 1 — PRE-ASSEMBLY (0ms to 650ms)
    // Show existing Part 1–5 pieces in their cards exactly as they currently appear
    boardEl.classList.remove("assembled", "assembling", "idle-ready", "robot-welcome-emote");
    if (bannerEl) bannerEl.classList.add("hidden");
    if (glowEl) glowEl.classList.add("hidden");
    if (seamFlashEl) seamFlashEl.classList.remove("flash-active");
    if (emoteOverlayEl) emoteOverlayEl.classList.add("hidden");

    // STEP 2 — ASSEMBLY SEQUENCE
    activeAssemblyTimer = setTimeout(() => {
        boardEl.classList.add("assembling");
        playAssemblyPowerUpSound();

        // Staggered piece lift & convergence toward final coordinates
        for (let i = 1; i <= 6; i++) {
            const slotEl = document.querySelector(`.slot-${i}, .cr-slot-${i}`);
            if (slotEl) {
                slotEl.classList.add("piece-assembling");
            }
        }

        // Mid-point magnetic snap impulse
        setTimeout(() => {
            playMagneticSnapSound();
        }, 1100);

        // Seam flash & magnetic snap connection
        setTimeout(() => {
            if (seamFlashEl) seamFlashEl.classList.add("flash-active");
            playMagneticSnapSound();
        }, 1700);

        // STEP 3 — COMPLETE ROBOT (2200ms)
        // Pieces visually connect into ONE complete robot. Gaps and card borders eliminated.
        setTimeout(() => {
            boardEl.classList.remove("assembling");
            boardEl.classList.add("assembled");
            for (let i = 1; i <= 6; i++) {
                const slotEl = document.querySelector(`.slot-${i}, .cr-slot-${i}`);
                if (slotEl) slotEl.classList.remove("piece-assembling");
            }
            if (glowEl) {
                glowEl.classList.remove("hidden");
            }

            // STEP 4 — WELCOME EMOTE (Inspired by reference video)
            // Character notices player, raises greeting arm, blooms glowing heart emote, celebratory bounce
            setTimeout(() => {
                boardEl.classList.add("robot-welcome-emote");
                if (emoteOverlayEl) emoteOverlayEl.classList.remove("hidden");
                playEvolutionTriumphSound();
                if (typeof speakBuddy === "function") {
                    speakBuddy(`✨ All parts connected! I am fully assembled! Welcome to the journey!`, "excited", 4500);
                }

                // STEP 5 — FINAL STATE (After welcome animation)
                setTimeout(() => {
                    boardEl.classList.remove("robot-welcome-emote");
                    boardEl.classList.add("idle-ready");
                    if (emoteOverlayEl) emoteOverlayEl.classList.add("hidden");

                    if (bannerEl) {
                        bannerEl.classList.remove("hidden");
                        if (evoTitleEl) evoTitleEl.innerText = "ROBOT FULLY ASSEMBLED";
                        if (evoDescEl) evoDescEl.innerText = `All parts completed — ${currentZoneConfig.nextFormName} ready!`;
                    }

                    // Real data persistence in userProgress
                    userProgress.assemblyPlayed = userProgress.assemblyPlayed || {};
                    userProgress.assemblyPlayed[zoneNum] = true;
                    if (typeof saveProgress === "function") {
                        saveProgress();
                    }
                    updateBuddyAvatar();
                }, 4200);
            }, 400);

        }, 2200);

    }, 650);
}

// Web Audio synthesizer for shard socket sound
function playPuzzleShardChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
}

// Web Audio: Power-up synth sound for piece lift
function playAssemblyPowerUpSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(560, audioCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.28, audioCtx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
    } catch (e) {}
}

// Web Audio: High-tech magnetic snap click
function playMagneticSnapSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(980, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.14);
    } catch (e) {}
}

// Web Audio: Joyful triumphant chord arpeggio
function playEvolutionTriumphSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = "sine";
            const startTime = audioCtx.currentTime + idx * 0.14;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.28, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    } catch (e) {}
}

function openBuddyPuzzleModal(targetZone = null, justUnlockedPieceIndex = null) {
    document.querySelectorAll(".hud-dropdown-panel").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll(".hud-profile-trigger").forEach(el => el.classList.remove("active"));
    renderBuddyPuzzleModal(targetZone, justUnlockedPieceIndex);
    const modal = document.getElementById("buddy-puzzle-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
    }
    document.body.classList.add("puzzle-modal-open");
    playPuzzleShardChime();
}

function closeBuddyPuzzleModal() {
    const modal = document.getElementById("buddy-puzzle-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
    }
    document.body.classList.remove("puzzle-modal-open");
    // Remove transient just-unlocked/highlighted animation classes
    document.querySelectorAll(".puzzle-slot, .cr-slot").forEach(el => el.classList.remove("just-unlocked", "highlighted", "piece-assembling"));
    if (activeAssemblyTimer) {
        clearTimeout(activeAssemblyTimer);
        activeAssemblyTimer = null;
    }
    scrollToCurrentLevel();
}

// Acceptance Test & Diagnostic Helpers
window.setPartCompleted = function(partNum, zoneNum = 1) {
    userProgress = userProgress || { unlockedLevel: 1, stars: {}, playedBossAnimations: {}, unlockedPieces: {} };
    userProgress.stars = userProgress.stars || {};
    userProgress.unlockedPieces = userProgress.unlockedPieces || {};
    userProgress.unlockedPieces[zoneNum] = userProgress.unlockedPieces[zoneNum] || [];

    const config = ZONE_PUZZLE_CONFIG[zoneNum] || ZONE_PUZZLE_CONFIG[1];
    const parts = Array.isArray(partNum) ? partNum : [partNum];
    parts.forEach(p => {
        const pNum = Number(p);
        if (pNum >= 1 && pNum <= 5) {
            userProgress.stars[pNum] = 3;
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, pNum + 1);
        } else if (pNum === 6 || p === 'boss' || p === config.bossId) {
            // Unlocking the final part is completing the Boss Level!
            userProgress.stars[config.bossId] = 3;
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 6);
        }
    });

    // Recompute unlocked pieces based on actual level completion
    getZoneUnlockedPieces(zoneNum, userProgress);
    saveProgress();
    renderLevelNodes();
    updateHUD();
    updateBuddyAvatar();
    openBuddyPuzzleModal(zoneNum);
    return getZonePuzzlePiecesStatus(zoneNum, userProgress);
};

window.completePart = window.setPartCompleted;

window.resetRobotAssembly = function(zoneNum = 1) {
    if (userProgress.assemblyPlayed) {
        delete userProgress.assemblyPlayed[zoneNum];
        saveProgress();
    }
    renderBuddyPuzzleModal(zoneNum);
};

window.ZONE_PUZZLE_CONFIG = ZONE_PUZZLE_CONFIG;
window.getCurrentZonePuzzle = getCurrentZonePuzzle;
window.getZonePuzzlePiecesStatus = getZonePuzzlePiecesStatus;
window.isAllPartsCompleted = isAllPartsCompleted;
window.runCinematicAssemblySequence = runCinematicAssemblySequence;
window.renderBuddyPuzzleModal = renderBuddyPuzzleModal;
window.openBuddyPuzzleModal = openBuddyPuzzleModal;
window.closeBuddyPuzzleModal = closeBuddyPuzzleModal;

let activeSelectedLevel = null;
let isMouseDown = false;
let startX = 0;
let scrollLeftStart = 0;
let isDragging = false;

const AUTH_STORAGE_KEY = "language_lab_authenticated";
const STUDENT_KEY = "language_lab_student_id_v1";
const LAST_LOGIN_DATE_KEY = "language_lab_last_login_date_v1";
const APP_SESSION_KEY = "language_lab_app_session_v1";
const NOTIF_STORAGE_KEY = "language_lab_notifications_v1";
let currentStudentId = "";

function getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const INITIAL_NOTIFICATIONS = [
    { id: 'n1', icon: '🎯', title: 'Daily Challenge Active', desc: 'Complete Level 2 with 1 star to earn 50 XP!', category: 'challenge', time: '10 mins ago', unread: true },
    { id: 'n2', icon: '🏆', title: 'Badge Unlocked', desc: 'Unlocked "Forest Realm Master" achievement!', category: 'achievement', time: '1 hour ago', unread: true },
    { id: 'n3', icon: '⭐', title: 'Zone 1 Leaderboard', desc: 'You are currently ranked #1 in your group.', category: 'system', time: '2 hours ago', unread: false }
];

function loadHUDNotifications() {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return [...INITIAL_NOTIFICATIONS];
        }
    }
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return [...INITIAL_NOTIFICATIONS];
}

function renderHUDNotifications() {
    const notifBody = document.querySelector("#notif-dropdown .dropdown-body");
    const badgeCount = document.querySelector("#notif-dropdown .badge-count");
    const notifBellBadge = document.querySelector(".notif-badge");

    if (!notifBody) return;

    const notifs = loadHUDNotifications();

    const unreadCount = notifs.filter(n => n.unread).length;
    const totalCount = notifs.length;

    if (notifBellBadge) {
        notifBellBadge.textContent = totalCount;
        notifBellBadge.style.display = totalCount > 0 ? "flex" : "none";
    }

    if (badgeCount) {
        badgeCount.textContent = unreadCount > 0 ? `${unreadCount} New` : `${totalCount} Total`;
    }

    if (notifs.length === 0) {
        notifBody.innerHTML = `<div class="empty-notifs-msg" style="text-align: center; color: #94a3b8; padding: 24px 12px; font-size: 13px; font-weight: 600;">✨ No notifications</div>`;
        return;
    }

    notifBody.innerHTML = notifs.map(item => `
        <div class="notif-item ${item.unread ? 'unread' : ''}" data-id="${item.id}">
            <div class="notif-icon">${item.icon}</div>
            <div class="notif-info">
                <div class="notif-title">${item.title}</div>
                <div class="notif-desc">${item.desc}</div>
            </div>
            <button class="notif-delete-btn" title="Delete notification" onclick="deleteHUDNotification(event, '${item.id}')">✕</button>
        </div>
    `).join("");
}

window.deleteHUDNotification = function(event, id) {
    if (event) event.stopPropagation();
    let notifs = loadHUDNotifications();
    notifs = notifs.filter(n => n.id !== id);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
    renderHUDNotifications();
};

// Animated Falling Green Leaves for Zone 1 (Forest Realm Ancient Tree Area)
function initForestFallingLeaves() {
    const container = document.getElementById("forest-falling-leaves");
    if (!container) return;

    container.innerHTML = "";

    const leafColors = ["#4ade80", "#22c55e", "#16a34a", "#86efac", "#a3e635", "#15803d"];
    const leafCount = 22; // Natural leaf density falling from ancient tree canopy

    for (let i = 0; i < leafCount; i++) {
        const leaf = document.createElement("div");
        leaf.className = "falling-leaf";

        // Scoped to big tree area (Left: 1% to 18%, Top: 1% to 22%)
        const startX = (Math.random() * 17 + 1).toFixed(2);
        const startY = (Math.random() * 20 + 1).toFixed(2);

        const duration = (Math.random() * 5 + 4.5).toFixed(2); // 4.5s to 9.5s
        const delay = (Math.random() * 6).toFixed(2); // Staggered delays
        const size = Math.floor(Math.random() * 14 + 14); // 14px to 28px
        const color = leafColors[Math.floor(Math.random() * leafColors.length)];

        leaf.style.left = `${startX}%`;
        leaf.style.top = `${startY}%`;
        leaf.style.width = `${size}px`;
        leaf.style.height = `${size}px`;
        leaf.style.animationDuration = `${duration}s`;
        leaf.style.animationDelay = `${delay}s`;

        // SVG Leaf graphic
        leaf.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 3C17 3 13.5 3.5 10 7C6.5 10.5 5 15 5 15C5 15 9.5 13.5 13 10C16.5 6.5 17 3 17 3Z" fill="${color}"/>
                <path d="M5 15L3 21" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        `;

        container.appendChild(leaf);
    }
}

// Animated Falling Snow for Zone 2 (Frozen Glacier Realm Area)
function initGlacierFallingSnow() {
    const container = document.getElementById("glacier-falling-snow");
    if (!container) return;

    container.innerHTML = "";

    const snowflakeCount = 38; // Dense magical winter snowfall

    for (let i = 0; i < snowflakeCount; i++) {
        const flake = document.createElement("div");
        const isIcon = Math.random() > 0.45; // 55% crystal snowflakes, 45% soft glowing snow dots

        flake.className = isIcon ? "falling-snowflake icon" : "falling-snowflake dot";

        const startX = (Math.random() * 98 + 1).toFixed(2);
        const startY = (Math.random() * 15 - 5).toFixed(2);

        const duration = (Math.random() * 4.5 + 3.5).toFixed(2); // 3.5s to 8.0s fall duration
        const delay = (Math.random() * 5).toFixed(2); // Staggered delays

        flake.style.left = `${startX}%`;
        flake.style.top = `${startY}%`;
        flake.style.animationDuration = `${duration}s`;
        flake.style.animationDelay = `${delay}s`;

        if (isIcon) {
            const size = Math.floor(Math.random() * 10 + 10); // 10px to 20px
            flake.style.width = `${size}px`;
            flake.style.height = `${size}px`;
            flake.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="12" y1="2" x2="12" y2="22"></line>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line>
                </svg>
            `;
        } else {
            const size = Math.floor(Math.random() * 5 + 3); // 3px to 8px dots
            flake.style.width = `${size}px`;
            flake.style.height = `${size}px`;
        }

        container.appendChild(flake);
    }
}

// Animated Falling Pink Petals for Zone 3 (Blossom Haven Realm Area)
function initBlossomFallingPetals() {
    const container = document.getElementById("blossom-falling-petals");
    if (!container) return;

    container.innerHTML = "";

    const petalColors = ["#f472b6", "#ec4899", "#db2777", "#f43f5e", "#fbcfe8", "#fb7185"];
    const petalCount = 32;

    for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement("div");
        petal.className = "falling-petal";

        const startX = (Math.random() * 98 + 1).toFixed(2);
        const startY = (Math.random() * 20 + 1).toFixed(2);

        const duration = (Math.random() * 5 + 4.5).toFixed(2); // 4.5s to 9.5s
        const delay = (Math.random() * 6).toFixed(2); // Staggered delays
        const size = Math.floor(Math.random() * 12 + 12); // 12px to 24px
        const color = petalColors[Math.floor(Math.random() * petalColors.length)];

        petal.style.left = `${startX}%`;
        petal.style.top = `${startY}%`;
        petal.style.width = `${size}px`;
        petal.style.height = `${size}px`;
        petal.style.animationDuration = `${duration}s`;
        petal.style.animationDelay = `${delay}s`;

        petal.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8 2 4 6 4 11C4 16 8 21 12 22C16 21 20 16 20 11C20 6 16 2 12 2Z" fill="${color}" opacity="0.9"/>
                <path d="M12 4V18" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
            </svg>
        `;

        container.appendChild(petal);
    }
}

// Animated Waterfall & Water Flow for Zone 4 (Tropical Bay Realm Area)
function initTropicalWaterfallFlow() {
    const container = document.getElementById("tropical-waterfall-flow");
    if (!container) return;

    container.innerHTML = "";

    // 1. Cascading Waterfall Streams (Positioned EXACTLY on top of the upper-left waterfall stream image: Left 13% to 25%, Top 12% to 17%)
    const streakCount = 20;
    for (let i = 0; i < streakCount; i++) {
        const streak = document.createElement("div");
        streak.className = "waterfall-streak";

        // Align exactly over the upper-left waterfall cliff stream in the background image
        const startX = (Math.random() * 12 + 13).toFixed(2);
        const startY = (Math.random() * 5 + 12).toFixed(2);

        const duration = (Math.random() * 0.7 + 0.8).toFixed(2); // Fast fluid flow: 0.8s to 1.5s
        const delay = (Math.random() * 1.5).toFixed(2);
        const height = Math.floor(Math.random() * 20 + 35); // 35px to 55px stream length

        streak.style.left = `${startX}%`;
        streak.style.top = `${startY}%`;
        streak.style.height = `${height}px`;
        streak.style.animationDuration = `${duration}s`;
        streak.style.animationDelay = `${delay}s`;

        container.appendChild(streak);
    }

    // 2. Waterfall Splash Mist Clouds (Positioned EXACTLY at the waterfall base lagoon pool: Left 12% to 26%, Top 28% to 33%)
    const mistCount = 14;
    for (let i = 0; i < mistCount; i++) {
        const mist = document.createElement("div");
        mist.className = "water-mist";

        const startX = (Math.random() * 14 + 12).toFixed(2);
        const startY = (Math.random() * 5 + 28).toFixed(2);

        const duration = (Math.random() * 1.2 + 1.6).toFixed(2); // 1.6s to 2.8s
        const delay = (Math.random() * 2.5).toFixed(2);
        const size = Math.floor(Math.random() * 16 + 16); // 16px to 32px mist circles

        mist.style.left = `${startX}%`;
        mist.style.top = `${startY}%`;
        mist.style.width = `${size}px`;
        mist.style.height = `${size}px`;
        mist.style.animationDuration = `${duration}s`;
        mist.style.animationDelay = `${delay}s`;

        container.appendChild(mist);
    }

    // 3. Lagoon & River Surface Sparkles (Across the blue lagoon water under the waterfall)
    const sparkleCount = 18;
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement("div");
        sparkle.className = "water-sparkle";

        const startX = (Math.random() * 26 + 10).toFixed(2);
        const startY = (Math.random() * 18 + 26).toFixed(2);

        const duration = (Math.random() * 1.8 + 1.6).toFixed(2);
        const delay = (Math.random() * 3.5).toFixed(2);
        const size = Math.floor(Math.random() * 4 + 3); // 3px to 7px

        sparkle.style.left = `${startX}%`;
        sparkle.style.top = `${startY}%`;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.animationDuration = `${duration}s`;
        sparkle.style.animationDelay = `${delay}s`;

        container.appendChild(sparkle);
    }
}

// Animated Volcanic Smoke & Rising Embers for Zone 6 (Dragon Peak Volcanic Realm Area)
function initDragonLavaEffects() {
    const container = document.getElementById("dragon-lava-effects");
    if (!container) return;

    container.innerHTML = "";

    // 1. Rising Volcanic Smoke Clouds (Originating from volcanoes & chasms, floating up to the sky)
    const smokeCount = 18;
    for (let i = 0; i < smokeCount; i++) {
        const smoke = document.createElement("div");
        smoke.className = "lava-smoke";

        const startX = (Math.random() * 80 + 10).toFixed(2);
        const startY = (Math.random() * 35 + 40).toFixed(2);

        const duration = (Math.random() * 3.0 + 4.0).toFixed(2); // 4.0s to 7.0s rising smoke
        const delay = (Math.random() * 4).toFixed(2);
        const size = Math.floor(Math.random() * 35 + 30); // 30px to 65px smoke clouds

        smoke.style.left = `${startX}%`;
        smoke.style.top = `${startY}%`;
        smoke.style.width = `${size}px`;
        smoke.style.height = `${size}px`;
        smoke.style.animationDuration = `${duration}s`;
        smoke.style.animationDelay = `${delay}s`;

        container.appendChild(smoke);
    }

    // 2. Floating Fiery Embers & Sparks (Rising from lava pits up into the volcanic sky)
    const emberCount = 32;
    for (let i = 0; i < emberCount; i++) {
        const ember = document.createElement("div");
        ember.className = "lava-ember";

        const startX = (Math.random() * 90 + 5).toFixed(2);
        const startY = (Math.random() * 45 + 45).toFixed(2);

        const duration = (Math.random() * 3.5 + 3.0).toFixed(2); // 3.0s to 6.5s ember rise
        const delay = (Math.random() * 5).toFixed(2);
        const size = Math.floor(Math.random() * 4 + 3); // 3px to 7px ember dots

        ember.style.left = `${startX}%`;
        ember.style.top = `${startY}%`;
        ember.style.width = `${size}px`;
        ember.style.height = `${size}px`;
        ember.style.animationDuration = `${duration}s`;
        ember.style.animationDelay = `${delay}s`;

        container.appendChild(ember);
    }
}

// Animated Sandstorm & Heat Shimmer for Zone 5 (Golden Sands Desert Realm Area)
function initDesertSandEffects() {
    const container = document.getElementById("desert-sand-effects");
    if (!container) return;

    container.innerHTML = "";

    // 1. Blowing Sand Grains (Blowing diagonally across desert dunes)
    const particleCount = 35;
    for (let i = 0; i < particleCount; i++) {
        const sand = document.createElement("div");
        sand.className = "sand-particle";

        const startX = (Math.random() * 95 - 10).toFixed(2);
        const startY = (Math.random() * 85 + 5).toFixed(2);

        const duration = (Math.random() * 3.5 + 2.5).toFixed(2); // 2.5s to 6.0s
        const delay = (Math.random() * 5).toFixed(2);
        const size = Math.floor(Math.random() * 4 + 2); // 2px to 6px sand dots

        sand.style.left = `${startX}%`;
        sand.style.top = `${startY}%`;
        sand.style.width = `${size}px`;
        sand.style.height = `${size}px`;
        sand.style.animationDuration = `${duration}s`;
        sand.style.animationDelay = `${delay}s`;

        container.appendChild(sand);
    }

    // 2. Swirling Desert Wind Whisps
    const whispCount = 14;
    for (let i = 0; i < whispCount; i++) {
        const whisp = document.createElement("div");
        whisp.className = "sand-whisp";

        const startX = (Math.random() * 80 - 10).toFixed(2);
        const startY = (Math.random() * 75 + 10).toFixed(2);

        const duration = (Math.random() * 2.5 + 3.0).toFixed(2); // 3.0s to 5.5s
        const delay = (Math.random() * 4).toFixed(2);
        const width = Math.floor(Math.random() * 40 + 50); // 50px to 90px wide wind whisps

        whisp.style.left = `${startX}%`;
        whisp.style.top = `${startY}%`;
        whisp.style.width = `${width}px`;
        whisp.style.animationDuration = `${duration}s`;
        whisp.style.animationDelay = `${delay}s`;

        container.appendChild(whisp);
    }

    // 3. Golden Sun Heat Shimmer Sparkles over Pyramids & Dunes
    const shimmerCount = 18;
    for (let i = 0; i < shimmerCount; i++) {
        const shimmer = document.createElement("div");
        shimmer.className = "heat-shimmer";

        const startX = (Math.random() * 90 + 5).toFixed(2);
        const startY = (Math.random() * 80 + 10).toFixed(2);

        const duration = (Math.random() * 2.0 + 1.8).toFixed(2);
        const delay = (Math.random() * 4).toFixed(2);
        const size = Math.floor(Math.random() * 4 + 3); // 3px to 7px

        shimmer.style.left = `${startX}%`;
        shimmer.style.top = `${startY}%`;
        shimmer.style.width = `${size}px`;
        shimmer.style.height = `${size}px`;
        shimmer.style.animationDuration = `${duration}s`;
        shimmer.style.animationDelay = `${delay}s`;

        container.appendChild(shimmer);
    }
}

// Live Network Connection Status Indicator (Bottom Left Corner)
function initConnectionStatusIndicator() {
    let container = document.getElementById("connection-status-badge");
    if (!container) {
        container = document.createElement("div");
        container.id = "connection-status-badge";
        container.className = "connection-status-badge";
        document.body.appendChild(container);
    }

    function updateStatus() {
        const isOnline = navigator.onLine;
        if (isOnline) {
            container.className = "connection-status-badge online";
            container.innerHTML = `<span class="connection-status-dot"></span><span>Online</span>`;
        } else {
            container.className = "connection-status-badge offline";
            container.innerHTML = `<span class="connection-status-dot"></span><span>Offline</span>`;
        }
    }

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    setInterval(updateStatus, 3000);
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    initConnectionStatusIndicator();
    initLoginState();
    loadProgress();
    renderLevelNodes();
    updateHUD();
    renderHUDNotifications();
    initForestFallingLeaves();
    initGlacierFallingSnow();
    initBlossomFallingPetals();
    initTropicalWaterfallFlow();
    initDesertSandEffects();
    initDragonLavaEffects();

    // Event Listeners for Modal
    document.getElementById("modal-close")?.addEventListener("click", closeModal);
    document.getElementById("level-modal")?.addEventListener("click", (e) => {
        if (e.target.id === "level-modal") closeModal();
    });

    document.getElementById("buddy-puzzle-close")?.addEventListener("click", closeBuddyPuzzleModal);
    document.getElementById("buddy-puzzle-modal")?.addEventListener("click", (e) => {
        if (e.target.id === "buddy-puzzle-modal") closeBuddyPuzzleModal();
    });
    
    document.getElementById("play-level-btn")?.addEventListener("click", () => {
        if (activeSelectedLevel) {
            const levelToPlay = activeSelectedLevel;
            const isBoss = isBossLevel(levelToPlay.id);
            const pkgInfo = getLevelExperiencePackage(levelToPlay.id, isBoss);
            closeModal();
            if (window.electronAPI?.openEngine) {
                window.electronAPI.openEngine({
                    id: levelToPlay.id,
                    levelId: levelToPlay.id,
                    packageId: pkgInfo.packageId,
                    title: levelToPlay.title || pkgInfo.title,
                    zone: levelToPlay.zone,
                    zoneName: levelToPlay.zoneName,
                    isBoss: pkgInfo.isBoss
                });
            } else {
                console.log(`[Game] Playing Level ${levelToPlay.id}: ${levelToPlay.title} (${pkgInfo.packageId})`);
            }
        }
    });

    function checkAndHandlePendingLevelCompletion() {
        const pending = localStorage.getItem("language_lab_pending_completion_level") || sessionStorage.getItem("language_lab_just_completed_level");
        if (pending) {
            localStorage.removeItem("language_lab_pending_completion_level");
            sessionStorage.removeItem("language_lab_just_completed_level");
            console.log("[Game] Found pending completed level signal:", pending);
            completeLevel(pending, 3);
            return true;
        }
        return false;
    }
    window.checkAndHandlePendingLevelCompletion = checkAndHandlePendingLevelCompletion;

    if (window.electronAPI?.onLevelCompleted) {
        window.electronAPI.onLevelCompleted((data) => {
            if (data && data.levelId) {
                completeLevel(data.levelId, data.stars || 3);
            }
        });
    }

    // Real-time synchronization when returning focus to the map window
    window.addEventListener("focus", () => {
        if (!checkAndHandlePendingLevelCompletion()) {
            loadProgress();
            renderLevelNodes();
            updateHUD();
            checkAndTriggerPendingBossAnimations();
        }
    });

    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY || e.key === "language_lab_pending_completion_level") {
            if (!checkAndHandlePendingLevelCompletion()) {
                loadProgress();
                renderLevelNodes();
                updateHUD();
                checkAndTriggerPendingBossAnimations();
            }
        }
    });

    // Check on startup if user just returned from a completed level
    checkAndHandlePendingLevelCompletion();

    // Check if any Boss was newly unlocked (e.g. returning from completed Level 5)
    checkAndTriggerPendingBossAnimations();

    document.getElementById("sim-complete-btn")?.addEventListener("click", () => {
        if (activeSelectedLevel) {
            const levelId = activeSelectedLevel.id;
            closeModal();
            completeLevel(levelId, 3);
        }
    });

    document.getElementById("reset-btn")?.addEventListener("click", resetProgress);

    // Scroll map to current active level automatically
    setTimeout(scrollToCurrentLevel, 400);
});

// Verify Authentication & Manage Student Session
function initLoginState() {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const savedStudent = localStorage.getItem(STUDENT_KEY) || localStorage.getItem("language_lab_student_id") || "Student";

    if (!isAuthenticated) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(APP_SESSION_KEY);
        window.location.href = "login.html";
        return;
    }

    // Ensure session is active
    sessionStorage.setItem(APP_SESSION_KEY, "active");
    const today = getTodayDateString();
    localStorage.setItem(LAST_LOGIN_DATE_KEY, today);

    currentStudentId = savedStudent.trim();
    const studentTag = document.getElementById("hud-student-id-tag");
    if (studentTag) studentTag.innerText = currentStudentId;
    const modalStudentTag = document.getElementById("modal-student-id-tag");
    if (modalStudentTag) modalStudentTag.innerText = currentStudentId;

    // Load custom selected student avatar if set
    updateDashboardAvatar();

    setupHUDDropdowns();
    setupSubpageNavigation();
}

// Real-Time Dashboard Avatar Synchronization
function updateDashboardAvatar(newAvatarUrl) {
    const avatar = newAvatarUrl || localStorage.getItem("language_lab_selected_avatar_v1") || 'avatars/boy1.png';
    document.querySelectorAll(".profile-avatar-img, .panel-avatar, .modal-avatar-img, .profile-avatar-circle img").forEach(img => {
        if (img && img.src !== avatar) {
            img.src = avatar;
        }
    });
}
window.updateDashboardAvatar = updateDashboardAvatar;

// High-Performance Desktop Game Subpage Navigation System
let currentSubpageUrl = null;

function openSubpage(url) {
    const container = document.getElementById("subpage-view-container");
    const frame = document.getElementById("subpage-view-frame");
    if (!container || !frame) {
        window.location.href = url;
        return;
    }

    if (!frame.src || !frame.src.endsWith(url)) {
        frame.src = url;
        currentSubpageUrl = url;
    } else {
        // Subpage already resident in iframe: refresh its data instantly without reload
        try {
            if (frame.contentWindow && typeof frame.contentWindow.refreshProfileData === 'function') {
                frame.contentWindow.refreshProfileData();
            }
        } catch (e) {}
    }

    container.classList.remove("hidden");
    container.setAttribute("aria-hidden", "false");

    // Pause heavy 3D buddy rendering loops while subpage is open to save 100% CPU/GPU
    if (window.travelBuddy?.scene?.pause) {
        window.travelBuddy.scene.pause();
    }
}
window.openSubpage = openSubpage;

function closeSubpage() {
    const container = document.getElementById("subpage-view-container");
    if (container) {
        container.classList.add("hidden");
        container.setAttribute("aria-hidden", "true");
    }

    // Instantly resume 3D buddy rendering without any initialization delay
    if (window.travelBuddy?.scene?.resume) {
        window.travelBuddy.scene.resume();
    }

    // Ultra-fast dynamic state sync (re-reads localStorage in < 2ms, zero full reloads)
    updateDashboardAvatar();
    loadProgress();
    renderLevelNodes();
    updateHUD();
    renderHUDNotifications();
}
window.closeSubpage = closeSubpage;

function setupSubpageNavigation() {
    // Escape key closes subpage and returns to map immediately
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const container = document.getElementById("subpage-view-container");
            if (container && !container.classList.contains("hidden")) {
                closeSubpage();
            }
        }
    });

    // Listen to storage events across frames for real-time avatar updates
    window.addEventListener("storage", (e) => {
        if (e.key === "language_lab_selected_avatar_v1") {
            updateDashboardAvatar(e.newValue);
        }
    });

    // Pre-warm Profile in subpage iframe after idle delay for instant 0ms open
    setTimeout(() => {
        const frame = document.getElementById("subpage-view-frame");
        if (frame && !frame.src) {
            frame.src = "profile.html";
            currentSubpageUrl = "profile.html";
        }
    }, 1200);
}

// Top Right HUD Interactive Dropdowns Engine
function setupHUDDropdowns() {
    const notifBtn = document.getElementById("hud-notif-btn");
    const notifDropdown = document.getElementById("notif-dropdown");

    const profileBtn = document.getElementById("hud-profile-btn");
    const profileDropdown = document.getElementById("profile-dropdown");

    const robotBtn = document.getElementById("hud-robot-btn");
    const robotDropdown = document.getElementById("robot-dropdown");

    const openProfileModalBtn = document.getElementById("open-profile-modal-btn");
    const profileDetailsModal = document.getElementById("profile-details-modal");
    const profileModalClose = document.getElementById("profile-modal-close");
    const logoutBtn = document.getElementById("hud-logout-btn");

    const openPuzzleFromDropdownBtn = document.getElementById("open-puzzle-from-dropdown-btn");
    const hudPuzzleBtn = document.getElementById("hud-puzzle-btn");
    const viewAllNotifBtn = document.getElementById("view-all-notif-btn");

    let autoHideTimer = null;

    function closeAllHUDDropdowns() {
        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
        }
        notifDropdown?.classList.add("hidden");
        profileDropdown?.classList.add("hidden");
        robotDropdown?.classList.add("hidden");
        profileBtn?.classList.remove("active");
    }

    notifBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = notifDropdown.classList.contains("hidden");
        closeAllHUDDropdowns();
        if (isHidden) notifDropdown.classList.remove("hidden");
    });

    // Intercept profile button: open instantly in persistent shell without cold reload
    profileBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        closeAllHUDDropdowns();
        openSubpage("profile.html");
    });

    // Intercept view all notifications button
    viewAllNotifBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        closeAllHUDDropdowns();
        openSubpage("notifications.html");
    });

    robotBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = robotDropdown.classList.contains("hidden");
        closeAllHUDDropdowns();
        if (isHidden) {
            robotDropdown.classList.remove("hidden");
        }
    });

    // Handle mouse hovering to keep the robot message open if user wants to read or click
    robotDropdown?.addEventListener("mouseenter", () => {
        if (autoHideTimer) {
            clearTimeout(autoHideTimer);
            autoHideTimer = null;
        }
    });

    // Wire up "View Evolution Puzzle" button to open in persistent shell
    openPuzzleFromDropdownBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        closeAllHUDDropdowns();
        openSubpage("evolution.html");
    });

    // Wire up top HUD puzzle icon button to open in persistent shell
    hudPuzzleBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        closeAllHUDDropdowns();
        openSubpage("evolution.html");
    });

    openProfileModalBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAllHUDDropdowns();
        if (profileDetailsModal) profileDetailsModal.classList.remove("hidden");
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".hud-btn-group, .modal-overlay, .modal-card")) {
            closeAllHUDDropdowns();
        }
    });

    // Logout Option Click
    function handleLogout() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem("language_lab_student_id_v1");
        localStorage.removeItem("language_lab_last_login_date_v1");
        localStorage.removeItem("language_lab_student_session_v1");
        sessionStorage.removeItem(APP_SESSION_KEY);
        sessionStorage.clear();
        window.location.href = "login.html";
    }
    window.handleLogout = handleLogout;
    logoutBtn?.addEventListener("click", handleLogout);

    // Only show One Tutor Companion message briefly if user just logged in
    const justLoggedIn = sessionStorage.getItem("language_lab_just_logged_in") === "true";
    if (justLoggedIn && robotDropdown) {
        sessionStorage.removeItem("language_lab_just_logged_in");
        robotDropdown.classList.remove("hidden");
        autoHideTimer = setTimeout(() => {
            robotDropdown.classList.add("hidden");
            autoHideTimer = null;
        }, 4000);
    } else if (robotDropdown) {
        robotDropdown.classList.add("hidden");
    }
}

// ==========================================
// Mouse Track & Wheel Horizontal Scroll Engine
// ==========================================

// 0. Prevent Native HTML Image Drag (Allows smooth mouse-drag map panning without image ghosting)
window.addEventListener("dragstart", (e) => {
    e.preventDefault();
});

// 1. Mouse Wheel Scroll Engine (Translates vertical mouse wheel rotation directly to horizontal map scrolling)
function handleMouseWheel(e) {
    // Allow vertical scrolling inside dropdown panels and modals
    if (e.target.closest(".hud-dropdown-panel, .modal-card, .avatars-grid, select")) {
        return;
    }

    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (delta !== 0) {
        e.preventDefault();
        const moveAmount = delta * 1.6;
        document.documentElement.scrollLeft += moveAmount;
        document.body.scrollLeft += moveAmount;
        window.scrollBy(moveAmount, 0);
    }
}
window.addEventListener("wheel", handleMouseWheel, { passive: false });
document.addEventListener("wheel", handleMouseWheel, { passive: false });

// 2. Mouse Drag-to-Scroll Engine (Click & Drag map panning)
window.addEventListener("mousedown", (e) => {
    // Only trigger on left mouse button, ignore interactive buttons and dropdowns
    if (e.button !== 0 || e.target.closest(".modal-card, .hud-dropdown-panel, button, a, .hud-circle-btn, .hud-profile-trigger, .top-right-hud")) return;
    
    isMouseDown = true;
    isDragging = false;
    startX = e.clientX;
    scrollLeftStart = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
});

window.addEventListener("mousemove", (e) => {
    if (!isMouseDown) return;
    
    const xDiff = e.clientX - startX;
    if (Math.abs(xDiff) > 4) {
        isDragging = true;
        document.body.style.cursor = "grabbing";
    }
    
    if (isDragging) {
        e.preventDefault();
        const targetPos = scrollLeftStart - xDiff;
        document.documentElement.scrollLeft = targetPos;
        document.body.scrollLeft = targetPos;
        window.scrollTo(targetPos, 0);
    }
});

function stopDrag() {
    if (isMouseDown) {
        isMouseDown = false;
        document.body.style.cursor = "default";
        setTimeout(() => {
            isDragging = false;
        }, 50);
    }
}

window.addEventListener("mouseup", stopDrag);
window.addEventListener("mouseleave", stopDrag);

// Load User Progress from LocalStorage
function loadProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            userProgress = JSON.parse(saved);
            if (!userProgress.unlockedLevel || isNaN(Number(userProgress.unlockedLevel)) || userProgress.unlockedLevel < 1) {
                userProgress.unlockedLevel = 1;
            }
            if (!userProgress.stars || typeof userProgress.stars !== "object") {
                userProgress.stars = {};
            }
            if (!userProgress.playedBossAnimations || typeof userProgress.playedBossAnimations !== "object") {
                userProgress.playedBossAnimations = {};
            }
            if (!userProgress.unlockedPieces || typeof userProgress.unlockedPieces !== "object") {
                userProgress.unlockedPieces = {};
            }
            if (!userProgress.assemblyPlayed || typeof userProgress.assemblyPlayed !== "object") {
                userProgress.assemblyPlayed = {};
            }

            // Sanitize: A zone boss must be defeated to unlock the next zone (Levels 6, 11, 16, 21, 26)
            if (userProgress.unlockedLevel > 25 && (!userProgress.stars["boss-5"] || userProgress.stars["boss-5"] <= 0)) {
                userProgress.unlockedLevel = Math.min(userProgress.unlockedLevel, 25);
            }
            if (userProgress.unlockedLevel > 20 && (!userProgress.stars["boss-4"] || userProgress.stars["boss-4"] <= 0)) {
                userProgress.unlockedLevel = Math.min(userProgress.unlockedLevel, 20);
            }
            if (userProgress.unlockedLevel > 15 && (!userProgress.stars["boss-3"] || userProgress.stars["boss-3"] <= 0)) {
                userProgress.unlockedLevel = Math.min(userProgress.unlockedLevel, 15);
            }
            if (userProgress.unlockedLevel > 10 && (!userProgress.stars["boss-2"] || userProgress.stars["boss-2"] <= 0)) {
                userProgress.unlockedLevel = Math.min(userProgress.unlockedLevel, 10);
            }
            if (userProgress.unlockedLevel > 5 && (!userProgress.stars["boss-1"] || userProgress.stars["boss-1"] <= 0)) {
                userProgress.unlockedLevel = Math.min(userProgress.unlockedLevel, 5);
            }
            saveProgress();
        } else {
            userProgress = { unlockedLevel: 1, stars: {}, playedBossAnimations: {} };
            saveProgress();
        }
    } catch (e) {
        console.error("Error loading progress:", e);
        userProgress = { unlockedLevel: 1, stars: {}, playedBossAnimations: {} };
    }
}

// Save Progress to LocalStorage
function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
    } catch (e) {
        console.error("Error saving progress:", e);
    }
}

// Boss Level Unlocking & Visual Engine
const BOSS_LEVEL_IDS = ["boss-1", "boss-2", "boss-3", "boss-4", "boss-5", "boss-6"];

function isBossLevel(levelId) {
    if (typeof levelId === "string" && levelId.startsWith("boss-")) return true;
    return BOSS_NODES.some(b => b.id === levelId);
}

function getBossNode(levelId) {
    if (typeof levelId === "string" && levelId.startsWith("boss-")) {
        return BOSS_NODES.find(b => b.id === levelId);
    }
    return BOSS_NODES.find(b => b.id === `boss-${levelId}`);
}

function isLevelUnlocked(levelId) {
    if (isBossLevel(levelId)) {
        const boss = getBossNode(levelId);
        if (!boss) return false;
        return boss.requiredLevels.every(lvl => 
            (userProgress.stars[lvl] && userProgress.stars[lvl] > 0) || userProgress.unlockedLevel > lvl
        );
    }
    const lvlNum = Number(levelId);
    if (isNaN(lvlNum)) return false;

    // Boss gating: Level 6 & subsequent Zone levels remain locked until the Zone Boss is completed
    if (lvlNum >= 6 && (!userProgress.stars["boss-1"] || userProgress.stars["boss-1"] <= 0)) {
        return false;
    }
    if (lvlNum >= 11 && (!userProgress.stars["boss-2"] || userProgress.stars["boss-2"] <= 0)) {
        return false;
    }
    if (lvlNum >= 16 && (!userProgress.stars["boss-3"] || userProgress.stars["boss-3"] <= 0)) {
        return false;
    }
    if (lvlNum >= 21 && (!userProgress.stars["boss-4"] || userProgress.stars["boss-4"] <= 0)) {
        return false;
    }
    if (lvlNum >= 26 && (!userProgress.stars["boss-5"] || userProgress.stars["boss-5"] <= 0)) {
        return false;
    }

    return userProgress.unlockedLevel >= lvlNum;
}

// AI Buddy Speech & Notification Helper
function speakBuddy(message, emotion = "thinking", duration = 3500, targetElement = null) {
    const cleanMsg = String(message).trim();

    // 1. Direct TravelBuddy Integration
    if (window.travelBuddy) {
        if (typeof window.travelBuddy.setEmotion === "function") {
            window.travelBuddy.setEmotion(emotion);
        }
        if (targetElement && window.travelBuddy.gazeController?.lookAtElement) {
            try {
                window.travelBuddy.gazeController.lookAtElement(targetElement, { duration: 1600 });
            } catch (e) {}
        }
        if (typeof window.travelBuddy.say === "function") {
            window.travelBuddy.say(cleanMsg, duration);
            return;
        }
    }

    // 2. Direct MomoSpeech Layer Integration
    if (window.momoSpeech && typeof window.momoSpeech.say === "function") {
        window.momoSpeech.say(cleanMsg, { emotion: emotion, duration: duration });
        return;
    }

    // 3. Fallback Toast Notification
    showToast(cleanMsg);
}

function showToast(message) {
    let toast = document.getElementById("game-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "game-toast";
        toast.className = "game-toast hidden";
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");

    if (window.toastTimer) clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2800);
}

function triggerBossScreenShake() {
    const gameContainer = document.getElementById("game") || document.body;
    gameContainer.classList.remove("boss-shake-effect");
    void gameContainer.offsetWidth; // force DOM reflow
    gameContainer.classList.add("boss-shake-effect");
    setTimeout(() => {
        gameContainer.classList.remove("boss-shake-effect");
    }, 650);
}

function triggerBossUnlockAnimation(bossId = "boss-1") {
    const bossBtn = document.querySelector(`.boss-level-node[data-level-id="${bossId}"]`);
    if (bossBtn) {
        const parentWrapper = bossBtn.closest(".level-node-wrapper");
        if (parentWrapper) {
            parentWrapper.classList.remove("emerging-from-hole");
            void parentWrapper.offsetWidth; // force DOM reflow
            parentWrapper.classList.add("emerging-from-hole");
            setTimeout(() => triggerBossScreenShake(), 1250);
            setTimeout(() => {
                parentWrapper.classList.remove("emerging-from-hole");
                if (window.freshlyUnlockedBossId === bossId) window.freshlyUnlockedBossId = null;
                if (window.forceBossEmergeId === bossId) window.forceBossEmergeId = null;
            }, 2600);
            scrollToBossLevel(bossId);
            return;
        }
    }
    window.forceBossEmergeId = bossId;
    renderLevelNodes();
    scrollToBossLevel(bossId);
}
window.triggerBossUnlockAnimation = triggerBossUnlockAnimation;

function scrollToBossLevel(bossId) {
    const bossBtn = document.querySelector(`.boss-level-node[data-level-id="${bossId}"]`);
    if (bossBtn) {
        const parentWrapper = bossBtn.closest(".level-node-wrapper");
        if (parentWrapper) {
            const nodeLeft = parentWrapper.offsetLeft;
            const screenWidth = window.innerWidth;
            window.scrollTo({
                left: Math.max(0, nodeLeft - screenWidth / 2),
                behavior: "smooth"
            });
        }
    }
}

// Render Grounded Level Nodes
function renderLevelNodes() {
    const container = document.getElementById("level-nodes");
    container.innerHTML = "";

    const allNodes = [...LEVEL_NODES, ...BOSS_NODES];

    allNodes.forEach((level) => {
        const isBoss = isBossLevel(level.id);
        const unlocked = isLevelUnlocked(level.id);
        const isCompleted = isBoss
            ? (userProgress.stars[level.id] && userProgress.stars[level.id] > 0)
            : (Number(level.id) < userProgress.unlockedLevel || (userProgress.stars[level.id] && userProgress.stars[level.id] > 0));
        const isCurrent = unlocked && !isCompleted;
        const isLocked = !unlocked;

        // Hide Boss level completely until all preceding zone levels are completed
        if (isBoss && isLocked) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "level-node-wrapper";
        if (isBoss) wrapper.classList.add("boss-wrapper");
        wrapper.style.left = `${level.x}%`;
        wrapper.style.top = `${level.y}%`;

        // Special Boss Black Hole Void Portal Structure
        if (isBoss) {
            const portal = document.createElement("div");
            portal.className = "boss-black-hole-portal";
            portal.innerHTML = `
                <div class="black-hole-disc">
                    <div class="black-hole-outer-ring"></div>
                    <div class="black-hole-accretion-disk"></div>
                    <div class="black-hole-vortex-swirl"></div>
                    <div class="black-hole-event-horizon"></div>
                    <div class="black-hole-core-singularity"></div>
                    <div class="black-hole-dark-aura"></div>
                </div>
                <div class="black-hole-particles">
                    <span class="void-particle p1"></span>
                    <span class="void-particle p2"></span>
                    <span class="void-particle p3"></span>
                    <span class="void-particle p4"></span>
                    <span class="void-particle p5"></span>
                    <span class="void-particle p6"></span>
                </div>
                <div class="black-hole-shockwave-ring"></div>
                <div class="black-hole-lightning-sparks">
                    <span class="spark s1"></span>
                    <span class="spark s2"></span>
                    <span class="spark s3"></span>
                </div>
            `;
            wrapper.appendChild(portal);

            if (window.freshlyUnlockedBossId === level.id || window.forceBossEmergeId === level.id) {
                wrapper.classList.add("emerging-from-hole");
                setTimeout(() => triggerBossScreenShake(), 1250);
                setTimeout(() => {
                    wrapper.classList.remove("emerging-from-hole");
                    if (window.freshlyUnlockedBossId === level.id) window.freshlyUnlockedBossId = null;
                    if (window.forceBossEmergeId === level.id) window.forceBossEmergeId = null;
                }, 2600);
            }
        }

        const btn = document.createElement("button");
        btn.dataset.levelId = level.id;

        // Class State Mapping
        let stateClass = "locked";
        if (isCompleted) stateClass = "completed";
        else if (isCurrent) stateClass = "current";

        btn.className = `level-node zone-${level.zone} ${stateClass}`;
        if (isBoss) {
            btn.classList.add("boss-level-node");
            if (isLocked) btn.classList.add("boss-locked");
            else btn.classList.add("boss-unlocked");
        }

        if (level.img) {
            btn.classList.add("has-custom-img");
            const imgEl = document.createElement("img");
            imgEl.src = encodeURI(level.img);
            imgEl.alt = isBoss ? `${level.title}` : `Level ${level.id}`;
            imgEl.className = "level-node-img";

            imgEl.onerror = () => {
                btn.classList.remove("has-custom-img");
                btn.innerHTML = isLocked ? `<span class="lock-icon">🔒</span>` : `<span>${isBoss ? '👑' : level.id}</span>`;
            };

            btn.appendChild(imgEl);

            if (isLocked && !isBoss) {
                const lockSpan = document.createElement("span");
                lockSpan.className = "lock-icon locked-img-icon";
                lockSpan.textContent = "🔒";
                btn.appendChild(lockSpan);
            }
        } else {
            if (isLocked && !isBoss) {
                btn.innerHTML = `<span class="lock-icon">🔒</span>`;
            } else {
                btn.innerHTML = `<span>${isBoss ? '👑' : level.id}</span>`;
            }
        }

        // Special Boss Overlays
        if (isBoss) {
            if (isLocked) {
                const bossLockOverlay = document.createElement("div");
                bossLockOverlay.className = "boss-lock-badge";
                bossLockOverlay.innerHTML = `
                    <span class="boss-lock-icon">🔒</span>
                    <span class="boss-lock-label">BOSS LOCKED</span>
                `;
                btn.appendChild(bossLockOverlay);
            } else if (!isCompleted) {
                const bossCrownOverlay = document.createElement("div");
                bossCrownOverlay.className = "boss-unlocked-badge";
                bossCrownOverlay.innerHTML = `👑 BOSS`;
                bossCrownOverlay.title = "Boss Challenge Unlocked";
                wrapper.appendChild(bossCrownOverlay);
            }
        }

        // Click Handler
        btn.addEventListener("click", () => handleNodeClick(level, isLocked, isBoss, btn));

        wrapper.appendChild(btn);

        // Premium Emerald & Gold Achievement Seal Overlay for Completed Levels
        if (isCompleted) {
            const sealBadge = document.createElement("div");
            sealBadge.className = "completed-seal-badge";
            sealBadge.title = "Level Mastered";
            sealBadge.innerHTML = `
                <svg viewBox="0 0 36 36" class="seal-svg">
                    <defs>
                        <radialGradient id="emeraldGrad-${level.id}" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stop-color="#86efac"/>
                            <stop offset="35%" stop-color="#22c55e"/>
                            <stop offset="85%" stop-color="#15803d"/>
                            <stop offset="100%" stop-color="#052e16"/>
                        </radialGradient>
                        <linearGradient id="goldBorder-${level.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#fef08a"/>
                            <stop offset="30%" stop-color="#eab308"/>
                            <stop offset="70%" stop-color="#ca8a04"/>
                            <stop offset="100%" stop-color="#713f12"/>
                        </linearGradient>
                    </defs>
                    <circle cx="18" cy="18" r="16" fill="url(#emeraldGrad-${level.id})" stroke="url(#goldBorder-${level.id})" stroke-width="2.5"/>
                    <circle cx="18" cy="18" r="13" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
                    <path d="M11 18 L15.5 22.5 L25 13" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            wrapper.appendChild(sealBadge);
        }

        container.appendChild(wrapper);
    });
}

// Handle Level Button Clicks
function handleNodeClick(level, isLocked, isBoss, btnElement) {
    if (isDragging) return;

    if (isLocked) {
        // Shake animation for locked level
        btnElement.classList.add("shake");
        setTimeout(() => btnElement.classList.remove("shake"), 450);

        let lockMessage = "";
        if (isBoss) {
            const firstReq = level.requiredLevels ? level.requiredLevels[0] : 1;
            const lastReq = level.requiredLevels ? level.requiredLevels[level.requiredLevels.length - 1] : 5;
            lockMessage = `${level.title} is Locked! Complete Levels ${firstReq}–${lastReq} first to unlock!`;
        } else if (Number(level.id) === 6 && (!userProgress.stars["boss-1"] || userProgress.stars["boss-1"] <= 0)) {
            lockMessage = `Level 6 is Locked! Defeat the Zone 1 Boss first to enter Frozen Glacier!`;
        } else if (Number(level.id) === 11 && (!userProgress.stars["boss-2"] || userProgress.stars["boss-2"] <= 0)) {
            lockMessage = `Level 11 is Locked! Defeat the Zone 2 Boss first to enter Blossom Haven!`;
        } else if (Number(level.id) === 16 && (!userProgress.stars["boss-3"] || userProgress.stars["boss-3"] <= 0)) {
            lockMessage = `Level 16 is Locked! Defeat the Zone 3 Boss first to enter Tropical Bay!`;
        } else if (Number(level.id) === 21 && (!userProgress.stars["boss-4"] || userProgress.stars["boss-4"] <= 0)) {
            lockMessage = `Level 21 is Locked! Defeat the Zone 4 Boss first to enter Golden Sands!`;
        } else if (Number(level.id) === 26 && (!userProgress.stars["boss-5"] || userProgress.stars["boss-5"] <= 0)) {
            lockMessage = `Level 26 is Locked! Defeat the Zone 5 Boss first to enter Dragon Peak!`;
        } else {
            lockMessage = `Level ${level.id} is Locked! Complete previous levels first.`;
        }

        // AI-Buddy speaks message in its bubble with emotion & looking towards node
        speakBuddy(lockMessage, "confused", 3500, btnElement);
        return;
    }

    activeSelectedLevel = level;

    // Open engine or level modal when student clicks level node
    const isBossFinal = Boolean(isBoss || isBossLevel(level.id));
    const pkgInfo = getLevelExperiencePackage(level.id, isBossFinal);
    if (window.electronAPI?.openEngine) {
        window.electronAPI.openEngine({
            id: level.id,
            levelId: level.id,
            packageId: pkgInfo.packageId,
            title: level.title || pkgInfo.title,
            zone: level.zone,
            zoneName: level.zoneName,
            isBoss: pkgInfo.isBoss
        });
    } else {
        openModal(level);
    }
}

// Open Level Start Modal
function openModal(level) {
    const isBoss = isBossLevel(level.id);
    const modal = document.getElementById("level-modal");
    document.getElementById("modal-zone-badge").innerText = `Zone ${level.zone} • ${level.zoneName}`;
    document.getElementById("modal-level-title").innerText = isBoss
        ? `👑 Boss Challenge: ${level.title}`
        : `Level ${level.id}: ${level.title}`;
    document.getElementById("modal-level-desc").innerText = level.desc;

    // Display Earned Stars
    const starsEarned = userProgress.stars[level.id] || 0;
    const starsContainer = document.getElementById("modal-stars-display");
    let starsHtml = "";
    for (let i = 1; i <= 1; i++) {
        if (i <= starsEarned) starsHtml += `<span class="star">★</span>`;
        else starsHtml += `<span class="star star-empty">★</span>`;
    }
    starsContainer.innerHTML = starsHtml;

    modal.classList.remove("hidden");
}

// Close Modal
function closeModal() {
    const modal = document.getElementById("level-modal");
    modal.classList.add("hidden");
    activeSelectedLevel = null;
}

// Check and trigger any unplayed Boss unlock animations (e.g. when returning to Map after completing Level 5)
function checkAndTriggerPendingBossAnimations() {
    BOSS_NODES.forEach(boss => {
        const unlocked = isLevelUnlocked(boss.id);
        if (unlocked && !userProgress.playedBossAnimations?.[boss.id]) {
            userProgress.playedBossAnimations = userProgress.playedBossAnimations || {};
            userProgress.playedBossAnimations[boss.id] = true;
            saveProgress();
            
            // Re-render level nodes so Boss appears in DOM
            renderLevelNodes();
            updateHUD();

            // Automatically trigger the existing Boss black-hole emergence animation
            setTimeout(() => {
                triggerBossUnlockAnimation(boss.id);
                speakBuddy(`🌌 Dimensional Black Hole Opened! ${boss.title} Emerges!`, "excited", 4500);
            }, 300);
        }
    });
}
window.checkAndTriggerPendingBossAnimations = checkAndTriggerPendingBossAnimations;

// Complete Level & Unlock Next Level
function completeLevel(levelId, starsEarned = 3) {
    let normalizedLevelId = levelId;
    if (String(levelId) === "49" || String(levelId) === "44" || String(levelId) === "117" || String(levelId).toLowerCase().includes("picnic") || String(levelId).toLowerCase().includes("big_house") || String(levelId).toLowerCase().includes("house")) {
        normalizedLevelId = 1;
    }

    const prevBossStatuses = {};
    BOSS_NODES.forEach(b => {
        prevBossStatuses[b.id] = isLevelUnlocked(b.id);
    });

    const numId = Number(normalizedLevelId);
    userProgress.stars = userProgress.stars || {};
    userProgress.stars[normalizedLevelId] = Math.max(userProgress.stars[normalizedLevelId] || 0, starsEarned);
    if (!isNaN(numId)) {
        userProgress.stars[numId] = Math.max(userProgress.stars[numId] || 0, starsEarned);
    }

    const isBoss = isBossLevel(normalizedLevelId);
    let levelJustUnlocked = null;

    if (!isBoss && !isNaN(numId)) {
        // Do not advance unlockedLevel across zone boundaries (5, 10, 15, 20, 25)
        // Defeating the realm boss is required to unlock the next zone!
        if (numId % 5 !== 0 && numId >= userProgress.unlockedLevel && userProgress.unlockedLevel < 30) {
            userProgress.unlockedLevel = numId + 1;
            levelJustUnlocked = userProgress.unlockedLevel;
        }
    } else if (isBoss) {
        // Completing a Boss unlocks the first level of the next Zone realm
        if (normalizedLevelId === "boss-1" || normalizedLevelId === "1") {
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 6);
            levelJustUnlocked = 6;
        } else if (normalizedLevelId === "boss-2" || normalizedLevelId === "2") {
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 11);
            levelJustUnlocked = 11;
        } else if (normalizedLevelId === "boss-3" || normalizedLevelId === "3") {
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 16);
            levelJustUnlocked = 16;
        } else if (normalizedLevelId === "boss-4" || normalizedLevelId === "4") {
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 21);
            levelJustUnlocked = 21;
        } else if (normalizedLevelId === "boss-5" || normalizedLevelId === "5") {
            userProgress.unlockedLevel = Math.max(userProgress.unlockedLevel, 26);
            levelJustUnlocked = 26;
        }
    }

    saveProgress();

    // Check if any Boss level was just unlocked (e.g. Boss 1 after Level 5 completion)
    let newlyUnlockedBoss = null;
    BOSS_NODES.forEach(b => {
        if (!prevBossStatuses[b.id] && isLevelUnlocked(b.id) && !userProgress.playedBossAnimations?.[b.id]) {
            newlyUnlockedBoss = b;
        }
    });

    // Determine corresponding zone for the completed level
    let unlockedZoneNum = 1;
    if (isBoss) {
        unlockedZoneNum = Number(String(normalizedLevelId).replace("boss-", "")) || 1;
    } else if (!isNaN(numId)) {
        unlockedZoneNum = Math.min(6, Math.floor((numId - 1) / 5) + 1);
    }

    // Capture currently unlocked pieces before granting the new level's piece
    const prevUnlockedPieces = [...(userProgress.unlockedPieces?.[unlockedZoneNum] || [])];

    // Compute updated random unlocked pieces for this zone
    const currentUnlockedPieces = getZoneUnlockedPieces(unlockedZoneNum, userProgress);

    // Identify which random piece was newly discovered
    const newlyDiscoveredPiece = currentUnlockedPieces.find(p => !prevUnlockedPieces.includes(p)) || currentUnlockedPieces[currentUnlockedPieces.length - 1] || 1;
    const unlockedPieceIdx = newlyDiscoveredPiece;

    renderLevelNodes();
    updateHUD();
    updateBuddyAvatar();

    // Automatically reveal the Puzzle Board & snap the new random piece into place!
    setTimeout(() => {
        openBuddyPuzzleModal(unlockedZoneNum, unlockedPieceIdx);
    }, 450);

    if (newlyUnlockedBoss) {
        userProgress.playedBossAnimations = userProgress.playedBossAnimations || {};
        userProgress.playedBossAnimations[newlyUnlockedBoss.id] = true;
        saveProgress();
        setTimeout(() => {
            triggerBossUnlockAnimation(newlyUnlockedBoss.id);
            speakBuddy(`🌌 Dimensional Black Hole Opened! ${newlyUnlockedBoss.title} Emerges! Defeat the Boss to unlock Level 6!`, "excited", 5000);
        }, 800);
    } else if (isBoss) {
        const bossNode = getBossNode(normalizedLevelId);
        const bossTitle = bossNode?.title || "Boss";
        const avatarInfo = getBuddyAvatarInfo(userProgress);
        speakBuddy(`👑 Victory! ${bossTitle} Defeated! Part ${unlockedPieceIdx}/6 Discovered! I have evolved into ${avatarInfo.title}!`, "excited", 5000);
        scrollToCurrentLevel();
    } else if (levelJustUnlocked && isLevelUnlocked(levelJustUnlocked)) {
        speakBuddy(`🎉 Level ${numId} Completed! Discovered Mystery Shard: Part ${unlockedPieceIdx}/6 Unlocked! Level ${levelJustUnlocked} is now unlocked!`, "happy", 3500);
        scrollToCurrentLevel();
    } else if (numId === 5) {
        speakBuddy(`🎉 Level 5 Completed! Discovered Mystery Shard: Part ${unlockedPieceIdx}/6 Unlocked! Defeat the Forest Guardian Boss!`, "happy", 4000);
    } else {
        speakBuddy(`⭐ Level ${normalizedLevelId} Completed! Discovered Mystery Shard: Part ${unlockedPieceIdx}/6 Unlocked!`, "happy", 3000);
        scrollToCurrentLevel();
    }
}
window.completeLevel = completeLevel;
window.unlockNextLevel = function() {
    if (userProgress.unlockedLevel < 30) {
        completeLevel(userProgress.unlockedLevel, 3);
    }
};

// Update Top HUD Display
function updateHUD() {
    const totalLevels = 30;
    
    let totalStars = 0;
    Object.values(userProgress.stars).forEach(s => {
        if (s > 0) totalStars += 1;
    });

    const progressTextEl = document.getElementById("hud-progress-text");
    if (progressTextEl) progressTextEl.innerText = `${userProgress.unlockedLevel} / ${totalLevels}`;
    
    const progressFillEl = document.getElementById("hud-progress-fill");
    if (progressFillEl) {
        const fillPercent = (userProgress.unlockedLevel / totalLevels) * 100;
        progressFillEl.style.width = `${fillPercent}%`;
    }

    const starsTextEl = document.getElementById("hud-stars-text");
    if (starsTextEl) starsTextEl.innerText = `${totalStars} / ${totalLevels}`;

    // Profile Dropdown & Modal Stats
    const statStarsEl = document.getElementById("hud-stat-stars") || document.getElementById("modal-stat-stars");
    if (statStarsEl) statStarsEl.innerText = `${totalStars} ⭐`;

    const statLevelEl = document.getElementById("hud-stat-level") || document.getElementById("modal-stat-level");
    if (statLevelEl) statLevelEl.innerText = `Level ${userProgress.unlockedLevel}`;

    // Update Top HUD Puzzle Badge Count
    const currentZonePuzzle = getCurrentZonePuzzle(userProgress);
    const puzzleStatus = getZonePuzzlePiecesStatus(currentZonePuzzle.zone, userProgress);
    const puzzleBadgeEl = document.getElementById("hud-puzzle-badge");
    if (puzzleBadgeEl) {
        puzzleBadgeEl.innerText = `${puzzleStatus.unlockedCount}/6`;
    }

    // AI Buddy Seasonal Avatar Synchronization
    updateBuddyAvatar();

    // Dynamically Bind Authenticated Student Session Data (Fixes static fallback string bug)
    loadStudentProfileSession();
}

async function loadStudentProfileSession() {
    let sessionData = null;
    if (window.electronAPI && typeof window.electronAPI.loadStudentSession === "function") {
        try {
            sessionData = await window.electronAPI.loadStudentSession();
        } catch (e) {}
    }
    if (!sessionData) {
        try {
            const raw = localStorage.getItem("language_lab_student_session_v1");
            if (raw) sessionData = JSON.parse(raw);
        } catch (e) {}
    }

    const savedRoll = localStorage.getItem(STUDENT_KEY) || "STU-101";
    const rollNo = sessionData?.student?.roll_number || sessionData?.roll_number || savedRoll.trim();
    const studentName = sessionData?.student?.name || sessionData?.name || "";

    const modalTagEl = document.getElementById("modal-student-id-tag");
    if (modalTagEl) {
        modalTagEl.innerText = rollNo;
    }

    const modalUserNameEl = document.querySelector(".modal-user-name");
    if (modalUserNameEl) {
        modalUserNameEl.innerText = studentName || rollNo;
    }
}

// Lock All Levels Except Level 1 & Reset Progress
function lockAllLevelsExcept1(showPrompt = false) {
    if (!showPrompt || confirm("Are you sure you want to lock all levels except Level 1?")) {
        userProgress = { unlockedLevel: 1, stars: {}, playedBossAnimations: {}, unlockedPieces: {} };
        saveProgress();
        renderLevelNodes();
        updateHUD();
        scrollToCurrentLevel();
        showToast("🔒 All levels locked except Level 1!");
    }
}
function resetProgress() {
    lockAllLevelsExcept1(true);
}
window.lockAllLevelsExcept1 = lockAllLevelsExcept1;
window.resetProgress = resetProgress;

// Automatically scroll viewport to current unlocked level
function scrollToCurrentLevel() {
    const currentWrapper = document.querySelector(".level-node-wrapper .current") || document.querySelector(".level-node-wrapper");
    if (currentWrapper) {
        const parentWrapper = currentWrapper.closest(".level-node-wrapper");
        if (parentWrapper) {
            const nodeLeft = parentWrapper.offsetLeft;
            const screenWidth = window.innerWidth;
            window.scrollTo({
                left: Math.max(0, nodeLeft - screenWidth / 2),
                behavior: "smooth"
            });
        }
    }
}

// Fetch and display published packages received from CMS / Local Server API
async function loadCMSPublishedPackages(showToastFeedback = false) {
    // 0. High-performance cache check: reuse already-loaded static package metadata
    if (!showToastFeedback && Array.isArray(window.cmsPublishedPackages) && window.cmsPublishedPackages.length > 0) {
        console.log("[CMS Integration] ⚡ Reusing cached published packages (0ms overhead):", window.cmsPublishedPackages.length);
        return window.cmsPublishedPackages;
    }

    let publishedPackages = [];

    // Extract logged in student's grade or student ID from session / localStorage
    let studentGradeOrCode = null;
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        studentGradeOrCode = currentUser.grade || currentUser.code || currentUser.lms_code || currentUser.roll_no || localStorage.getItem('language_lab_student_id') || null;
    } catch (e) {}

    console.log("[CMS Integration] Loading packages for student grade/ID:", studentGradeOrCode);

    // 1. Try IPC bridge getCmsPackages with student grade/code
    if (window.electronAPI && typeof window.electronAPI.getCmsPackages === "function") {
        try {
            publishedPackages = await window.electronAPI.getCmsPackages(studentGradeOrCode);
        } catch (e) {
            console.warn("[CMS Integration] IPC getCmsPackages failed, falling back to HTTP sync:", e);
        }
    }

    // 2. HTTP Fallback sync if IPC returned empty or unavailable (strict 600ms timeout)
    if (!Array.isArray(publishedPackages) || publishedPackages.length === 0) {
        try {
            const ports = [8000, 5000];
            for (const port of ports) {
                try {
                    const gradeParam = studentGradeOrCode ? `?grade=${encodeURIComponent(studentGradeOrCode)}` : '';
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 600);
                    const res = await fetch(`http://localhost:${port}/api/v1/lms/published-packages/${gradeParam}`, {
                        method: "GET",
                        headers: { "Accept": "application/json" },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        const data = await res.json();
                        publishedPackages = data.packages || (Array.isArray(data) ? data : []);
                        if (publishedPackages.length > 0) break;
                    }
                } catch (e) {}
            }
        } catch (err) {
            console.warn("[CMS Integration] Network fetch for published packages failed:", err);
        }
    }

    window.cmsPublishedPackages = publishedPackages;
    console.log("[CMS Integration] Published packages synced for grade:", studentGradeOrCode, publishedPackages);

    if (Array.isArray(publishedPackages) && publishedPackages.length > 0) {
        // Dynamically map CMS packages to map level nodes in order:
        // Package 1 -> Level 1, Package 2 -> Level 2, Package 3 -> Level 3...
        publishedPackages.forEach((pkg, index) => {
            if (LEVEL_NODES[index]) {
                const title = pkg.title || pkg.packageName || `Level ${index + 1}`;
                const desc = pkg.description || `Master your skills with ${title}.`;
                LEVEL_NODES[index].title = title;
                LEVEL_NODES[index].desc = desc;
                LEVEL_NODES[index].cmsLessonId = pkg.packageId || pkg.id;
                LEVEL_NODES[index].grade = pkg.grade || studentGradeOrCode || '';
            }
        });

        // Re-render level nodes so titles and descriptions reflect real CMS packages
        renderLevelNodes();

        let notifs = loadHUDNotifications();
        let hasNewNotif = false;

        publishedPackages.forEach(pkg => {
            const notifId = `cms_${pkg.packageId}`;
            const existing = notifs.find(n => n.id === notifId);
            if (!existing) {
                notifs.unshift({
                    id: notifId,
                    icon: '📦',
                    title: `CMS Course: ${pkg.packageName || pkg.title}`,
                    desc: pkg.description || `New lesson package ready to play!`,
                    category: 'system',
                    time: 'Just now',
                    unread: true
                });
                hasNewNotif = true;
            }
        });

        if (hasNewNotif) {
            localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
            renderHUDNotifications();
        }

        if (showToastFeedback) {
            showToast(`🔄 Lessons Synced! Loaded ${publishedPackages.length} package(s).`);
        }
    } else if (showToastFeedback) {
        showToast("ℹ️ Lessons synced. No new published packages found.");
    }

    return publishedPackages;
}

document.addEventListener("DOMContentLoaded", () => {
    loadCMSPublishedPackages();
});
