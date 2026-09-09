const assert = require('assert');
const fs = require('fs');
const {
    BuddyRigController,
    BUDDY_RIG_CONFIG,
    BuddyAnimationEngine
} = require('../src/components/TravelBuddy/index');

console.log('========================================================');
console.log('VERIFYING BOTH ROBOTS (ROBOT 1 & ROBOT 2 ICE BLUE)');
console.log('========================================================\n');

class MockSVGElement {
    constructor(id) {
        this.id = id;
        this.style = {};
        this.attributes = {};
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
}

function createMockSvgDoc(svgPath) {
    const content = fs.readFileSync(svgPath, 'utf8');
    const elements = {};
    return {
        content,
        getElementById(id) {
            if (!elements[id] && content.includes(`id="${id}"`)) {
                elements[id] = new MockSVGElement(id);
            }
            return elements[id] || null;
        },
        querySelector(sel) {
            const id = sel.replace('#', '');
            return this.getElementById(id);
        }
    };
}

// Test Robot 1: AI/PNg.svg
console.log('--- TESTING ROBOT 1: AI/PNg.svg ---');
const doc1 = createMockSvgDoc('AI/PNg.svg');
const rig1 = new BuddyRigController({ characterElement: doc1 }, BUDDY_RIG_CONFIG);
rig1.attachSvg(doc1);
const anim1 = new BuddyAnimationEngine(rig1);

let parts1Count = 0;
for (const [key, def] of Object.entries(BUDDY_RIG_CONFIG.parts)) {
    if (rig1.getPart(key)) parts1Count++;
}
console.log(`Robot 1 parts attached: ${parts1Count} / 22`);
assert.strictEqual(parts1Count, 22, 'Robot 1 should have all 22 parts attached');

// Test Robot 2: AI/ICE BLUE ROBOT.svg
console.log('\n--- TESTING ROBOT 2: AI/ICE BLUE ROBOT.svg ---');
const doc2 = createMockSvgDoc('AI/ICE BLUE ROBOT.svg');
const rig2 = new BuddyRigController({ characterElement: doc2 }, BUDDY_RIG_CONFIG);
rig2.attachSvg(doc2);
const anim2 = new BuddyAnimationEngine(rig2);

let parts2Count = 0;
for (const [key, def] of Object.entries(BUDDY_RIG_CONFIG.parts)) {
    if (rig2.getPart(key)) parts2Count++;
}
console.log(`Robot 2 parts attached: ${parts2Count} / 22`);
assert.strictEqual(parts2Count, 22, 'Robot 2 should have all 22 parts attached');

async function testAnimations(name, rig, anim) {
    console.log(`\nTesting actions on ${name}:`);
    
    // 1. Head rotation
    await anim.animate('head', { rotation: 18 }, { duration: 30 });
    assert.strictEqual(rig.getPartState('head').rotation, 18, 'Head rotation failed');
    console.log(`  ✓ Head rotation (18°) succeeded`);

    // 2. Wave action (right arm)
    await anim.animate('rightUpperArm', { rotation: -45 }, { duration: 30 });
    assert.strictEqual(rig.getPartState('rightUpperArm').rotation, -45, 'Right arm rotation failed');
    console.log(`  ✓ Wave gesture (Right arm -45°) succeeded`);

    // 3. Eyes gaze
    await anim.animate('leftEye', { x: -6, y: -4 }, { duration: 30 });
    assert.strictEqual(rig.getPartState('leftEye').x, -6, 'Left eye position failed');
    console.log(`  ✓ Eyes gaze translation (-6px) succeeded`);

    // 4. Reset
    rig.resetAll();
    assert.strictEqual(rig.getPartState('head').rotation, 0, 'Head reset failed');
    assert.strictEqual(rig.getPartState('rightUpperArm').rotation, 0, 'Arm reset failed');
    console.log(`  ✓ Reset to neutral pose succeeded`);
}

async function run() {
    await testAnimations('Robot 1 (Base White)', rig1, anim1);
    await testAnimations('Robot 2 (Ice Blue)', rig2, anim2);
    console.log('\n========================================================');
    console.log('BOTH ROBOTS FULLY VALIDATED & 100% FUNCTIONAL!');
    console.log('========================================================');
}

run().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
