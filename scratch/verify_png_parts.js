const fs = require('fs');
const { BUDDY_RIG_CONFIG } = require('../src/components/TravelBuddy/buddyRigConfig');

const svgContent = fs.readFileSync('AI/PNg.svg', 'utf8');

const missing = [];
const found = [];
for (const [key, partDef] of Object.entries(BUDDY_RIG_CONFIG.parts)) {
    const idStr = `id="${partDef.id}"`;
    if (svgContent.includes(idStr)) {
        found.push(partDef.id);
    } else {
        missing.push(partDef.id);
    }
}

console.log(`PNG Parts detected: ${found.length} / ${Object.keys(BUDDY_RIG_CONFIG.parts).length}`);
if (missing.length > 0) {
    console.log('PNG Missing parts:', missing);
}
