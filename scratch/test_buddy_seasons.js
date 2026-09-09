const { getBuddyAvatarForProgress } = (function() {
    function getBuddyAvatarForProgress(progress) {
        if (!progress) return 'AI/PNg.svg';
        if ((progress.stars && progress.stars['boss-5'] > 0) || (progress.unlockedLevel && progress.unlockedLevel >= 26)) {
            return 'AI/RED ROBOT.svg';
        }
        if ((progress.stars && progress.stars['boss-4'] > 0) || (progress.unlockedLevel && progress.unlockedLevel >= 21)) {
            return 'AI/GOLD ROBOT.svg';
        }
        if ((progress.stars && progress.stars['boss-3'] > 0) || (progress.unlockedLevel && progress.unlockedLevel >= 16)) {
            return 'AI/GREEN.svg';
        }
        if ((progress.stars && progress.stars['boss-2'] > 0) || (progress.unlockedLevel && progress.unlockedLevel >= 11)) {
            return 'AI/PURPLE ROBOT.svg';
        }
        if ((progress.stars && progress.stars['boss-1'] > 0) || (progress.unlockedLevel && progress.unlockedLevel >= 6)) {
            return 'AI/ICE BLUE ROBOT.svg';
        }
        return 'AI/PNg.svg';
    }
    return { getBuddyAvatarForProgress };
})();

console.log('1. Zone 1 (Forest Realm):', getBuddyAvatarForProgress({ unlockedLevel: 1, stars: {} }));
console.log('2. Zone 2 (Frozen Glacier - After Forest Boss):', getBuddyAvatarForProgress({ unlockedLevel: 6, stars: { 'boss-1': 3 } }));
console.log('3. Zone 3 (Blossom Haven - After Glacier Boss):', getBuddyAvatarForProgress({ unlockedLevel: 11, stars: { 'boss-2': 3 } }));
console.log('4. Zone 4 (Tropical Bay - After Blossom Boss):', getBuddyAvatarForProgress({ unlockedLevel: 16, stars: { 'boss-3': 3 } }));
console.log('5. Zone 5 (Golden Sands - After Tropical Boss):', getBuddyAvatarForProgress({ unlockedLevel: 21, stars: { 'boss-4': 3 } }));
console.log('6. Zone 6 (Dragon Peak - After Golden Sands Boss):', getBuddyAvatarForProgress({ unlockedLevel: 26, stars: { 'boss-5': 3 } }));
