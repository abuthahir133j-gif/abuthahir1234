// ==========================================
// Language Lab - Level Map Data & State Engine
// ==========================================

const LEVEL_NODES = [
    // Zone 1: Forest Realm (Levels 1-6) - Exactly on paved stone road
    { id: 1, zone: 1, zoneName: "Forest Realm", title: "Gate of Beginnings", desc: "Begin your language journey at the ancient forest gate.", x: 4.8, y: 82, img: "Level/level 1.png" },
    { id: 2, zone: 1, zoneName: "Forest Realm", title: "Whispering Woods", desc: "Navigate the winding paths through the green canopy.", x: 8.2, y: 70, img: "Level/level 2.png" },
    { id: 3, zone: 1, zoneName: "Forest Realm", title: "Waterfall Crossing", desc: "Cross the wooden bridge over the rushing forest waterfall.", x: 12, y: 60, img: "Level/level 3.png" },
    { id: 4, zone: 1, zoneName: "Forest Realm", title: "Ancient Tree Sanctuary", desc: "Discover hidden words beneath the great ancient tree.", x: 15.9, y: 53, img: "Level/level 4.png" },
    { id: 5, zone: 1, zoneName: "Forest Realm", title: "Forest Village Outpost", desc: "Interact with villagers to learn foundational phrases.", x: 17.5, y: 40, img: "Level/level 5.png" },
    { id: 6, zone: 1, zoneName: "Forest Realm", title: "Emerald Archway", desc: "Unlock the magical archway leading toward the snowy peaks.", x: 20.6, y: 38, img: "Level/level 6.png" },
    

    // Zone 2: Frozen Glacier (Levels 7-10)
    { id: 7, zone: 2, zoneName: "Frozen Glacier", title: "Frostbite Bridge", desc: "Cross the icy stone bridge into the snowbound kingdom.", x: 23.5, y: 45.5, img: "Level/level 7.png" },
    { id: 8, zone: 2, zoneName: "Frozen Glacier", title: "Crystal Cavern", desc: "Explore glowing blue ice crystals and master new terms.", x: 26.3, y: 56, img: "Level/level 8.png" },
    { id: 9, zone: 2, zoneName: "Frozen Glacier", title: "Snowy Village Plaza", desc: "Solve challenges in the heart of the snow village.", x: 28.0, y: 70, img: "Level/level 9.png" },
    { id: 10, zone: 2, zoneName: "Frozen Glacier", title: "Ice Citadel Gate", desc: "Conquer the frozen gate to reach the cherry blossom valley.", x: 31, y: 79, img: "Level/level 10.png" },
// { id: 10, zone: 2, zoneName: "Frozen Glacier", title: "Ice Citadel Gate", desc: "Conquer the frozen gate to reach the cherry blossom valley.", x: 30.5, y: 62, img: "Level/iceboss.png" },

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
    { id: 30, zone: 6, zoneName: "Dragon Peak", title: "Dragon Citadel Final Boss", desc: "Face the ultimate language challenge atop Dragon's Citadel!", x: 94.5, y: 40.5, img: "Level/level 30.png" },
    { id: 31, zone: 6, zoneName: "Dragon Peak", title: "Dragon Citadel Final Boss", desc: "Face the ultimate language challenge atop Dragon's Citadel!", x: 97.5, y: 30.5, img: "Level/lava boss.png" }
];

// App State Management
const STORAGE_KEY = "language_lab_level_progress_v1";
let userProgress = {
    unlockedLevel: 1,
    stars: {}
};

let activeSelectedLevel = null;
let isMouseDown = false;
let startX = 0;
let scrollLeftStart = 0;
let isDragging = false;

const AUTH_STORAGE_KEY = "language_lab_authenticated";
const STUDENT_KEY = "language_lab_student_id_v1";
const NOTIF_STORAGE_KEY = "language_lab_notifications_v1";
let currentStudentId = "";

const INITIAL_NOTIFICATIONS = [
    { id: 'n1', icon: '🎯', title: 'Daily Challenge Active', desc: 'Complete Level 2 with 3 stars to earn 50 XP!', category: 'challenge', time: '10 mins ago', unread: true },
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

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
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
    
    document.getElementById("play-level-btn")?.addEventListener("click", () => {
        if (activeSelectedLevel) {
            alert(`🎮 Starting ${activeSelectedLevel.title}!\n\n(Level gameplay engine active!)`);
        }
    });

    document.getElementById("sim-complete-btn")?.addEventListener("click", () => {
        if (activeSelectedLevel) {
            completeLevel(activeSelectedLevel.id, 3);
            closeModal();
        }
    });

    document.getElementById("reset-btn")?.addEventListener("click", resetProgress);

    // Scroll map to current active level automatically
    setTimeout(scrollToCurrentLevel, 400);
});

// Verify Authentication & Manage Student Session
function initLoginState() {
    const isAuthenticated = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
    const savedStudent = localStorage.getItem(STUDENT_KEY);

    if (!isAuthenticated || !savedStudent) {
        window.location.href = "login.html";
        return;
    }

    currentStudentId = savedStudent.trim();
    const studentTag = document.getElementById("hud-student-id-tag");
    if (studentTag) studentTag.innerText = currentStudentId;
    const modalStudentTag = document.getElementById("modal-student-id-tag");
    if (modalStudentTag) modalStudentTag.innerText = currentStudentId;

    // Load custom selected student avatar if set
    const savedAvatar = localStorage.getItem("language_lab_selected_avatar_v1");
    if (savedAvatar) {
        document.querySelectorAll(".profile-avatar-img, .panel-avatar").forEach(img => {
            img.src = savedAvatar;
        });
    }

    setupHUDDropdowns();
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

    profileBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = profileDropdown.classList.contains("hidden");
        closeAllHUDDropdowns();
        if (isHidden) {
            profileDropdown.classList.remove("hidden");
            profileBtn.classList.add("active");
        }
    });

    robotBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = robotDropdown.classList.contains("hidden");
        closeAllHUDDropdowns();
        if (isHidden) {
            robotDropdown.classList.remove("hidden");
            autoHideTimer = setTimeout(() => {
                robotDropdown.classList.add("hidden");
                autoHideTimer = null;
            }, 2000);
        }
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".hud-btn-group")) {
            closeAllHUDDropdowns();
        }
    });

    // Logout Option Click
    logoutBtn?.addEventListener("click", () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(STUDENT_KEY);
        window.location.href = "login.html";
    });

    // Automatically show One Tutor Companion message for 2 seconds on initial load / login
    if (robotDropdown) {
        robotDropdown.classList.remove("hidden");
        autoHideTimer = setTimeout(() => {
            robotDropdown.classList.add("hidden");
            autoHideTimer = null;
        }, 2000);
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
    if (e.button !== 0 || e.target.closest(".modal-card, .hud-dropdown-panel, button, a, .hud-circle-btn, .hud-profile-trigger")) return;
    
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
        }
    } catch (e) {
        console.error("Error loading progress:", e);
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

// Render Grounded Level Nodes
function renderLevelNodes() {
    const container = document.getElementById("level-nodes");
    container.innerHTML = "";

    LEVEL_NODES.forEach((level) => {
        const isCompleted = level.id < userProgress.unlockedLevel || userProgress.stars[level.id] > 0;
        const isCurrent = level.id === userProgress.unlockedLevel;
        const isLocked = level.id > userProgress.unlockedLevel;

        const wrapper = document.createElement("div");
        wrapper.className = "level-node-wrapper";
        wrapper.style.left = `${level.x}%`;
        wrapper.style.top = `${level.y}%`;

        const btn = document.createElement("button");
        btn.dataset.levelId = level.id;

        // Class State Mapping
        let stateClass = "locked";
        if (isCompleted) stateClass = "completed";
        else if (isCurrent) stateClass = "current";

        btn.className = `level-node zone-${level.zone} ${stateClass}`;

        if (level.img) {
            btn.classList.add("has-custom-img");
            const imgEl = document.createElement("img");
            imgEl.src = encodeURI(level.img);
            imgEl.alt = `Level ${level.id}`;
            imgEl.className = "level-node-img";

            imgEl.onerror = () => {
                btn.classList.remove("has-custom-img");
                btn.innerHTML = isLocked ? `<span class="lock-icon">🔒</span>` : `<span>${level.id}</span>`;
            };

            btn.appendChild(imgEl);

            if (isLocked) {
                const lockSpan = document.createElement("span");
                lockSpan.className = "lock-icon locked-img-icon";
                lockSpan.textContent = "🔒";
                btn.appendChild(lockSpan);
            }
        } else {
            if (isLocked) {
                btn.innerHTML = `<span class="lock-icon">🔒</span>`;
            } else {
                btn.innerHTML = `<span>${level.id}</span>`;
            }
        }

        // Click Handler
        btn.addEventListener("click", () => handleNodeClick(level, isLocked, btn));

        wrapper.appendChild(btn);

        // Star indicator pill for completed or current levels with stars
        const starsEarned = userProgress.stars[level.id] || 0;
        if (isCompleted || starsEarned > 0) {
            const starsPill = document.createElement("div");
            starsPill.className = "node-stars";
            let starsHtml = "";
            for (let i = 1; i <= 3; i++) {
                if (i <= starsEarned) starsHtml += `★`;
                else starsHtml += `<span class="star-off">★</span>`;
            }
            starsPill.innerHTML = starsHtml;
            wrapper.appendChild(starsPill);
        }

        container.appendChild(wrapper);
    });
}

// Handle Level Button Clicks
function handleNodeClick(level, isLocked, btnElement) {
    if (isDragging) return;

    if (isLocked) {
        // Shake animation for locked level
        btnElement.classList.add("shake");
        setTimeout(() => btnElement.classList.remove("shake"), 450);
        return;
    }

    activeSelectedLevel = level;
    openModal(level);
}

// Open Level Start Modal
function openModal(level) {
    const modal = document.getElementById("level-modal");
    document.getElementById("modal-zone-badge").innerText = `Zone ${level.zone} • ${level.zoneName}`;
    document.getElementById("modal-level-title").innerText = `Level ${level.id}: ${level.title}`;
    document.getElementById("modal-level-desc").innerText = level.desc;

    // Display Earned Stars
    const starsEarned = userProgress.stars[level.id] || 0;
    const starsContainer = document.getElementById("modal-stars-display");
    let starsHtml = "";
    for (let i = 1; i <= 3; i++) {
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

// Complete Level & Unlock Next Level
function completeLevel(levelId, starsEarned = 3) {
    userProgress.stars[levelId] = Math.max(userProgress.stars[levelId] || 0, starsEarned);

    if (levelId === userProgress.unlockedLevel && userProgress.unlockedLevel < LEVEL_NODES.length) {
        userProgress.unlockedLevel += 1;
    }

    saveProgress();
    renderLevelNodes();
    updateHUD();

    // Scroll focus to new current level
    scrollToCurrentLevel();
}

// Update Top HUD Display
function updateHUD() {
    const totalLevels = LEVEL_NODES.length;
    
    let totalStars = 0;
    Object.values(userProgress.stars).forEach(s => totalStars += s);

    const progressTextEl = document.getElementById("hud-progress-text");
    if (progressTextEl) progressTextEl.innerText = `${userProgress.unlockedLevel} / ${totalLevels}`;
    
    const progressFillEl = document.getElementById("hud-progress-fill");
    if (progressFillEl) {
        const fillPercent = (userProgress.unlockedLevel / totalLevels) * 100;
        progressFillEl.style.width = `${fillPercent}%`;
    }

    const starsTextEl = document.getElementById("hud-stars-text");
    if (starsTextEl) starsTextEl.innerText = `${totalStars} / ${totalLevels * 3}`;

    // Profile Dropdown & Modal Stats
    const statStarsEl = document.getElementById("hud-stat-stars") || document.getElementById("modal-stat-stars");
    if (statStarsEl) statStarsEl.innerText = `${totalStars} ⭐`;

    const statLevelEl = document.getElementById("hud-stat-level") || document.getElementById("modal-stat-level");
    if (statLevelEl) statLevelEl.innerText = `Level ${userProgress.unlockedLevel}`;
}

// Reset User Progress
function resetProgress() {
    if (confirm("Are you sure you want to reset all level progress?")) {
        userProgress = { unlockedLevel: 1, stars: {} };
        saveProgress();
        renderLevelNodes();
        updateHUD();
        scrollToCurrentLevel();
    }
}

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
