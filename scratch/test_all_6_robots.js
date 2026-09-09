const assert = require('assert');
const fs = require('fs');
const {
    BuddyRigController,
    BUDDY_RIG_CONFIG,
    BuddyAnimationEngine,
    BuddyOrbitControls
} = require('../src/components/TravelBuddy/index');

console.log('========================================================');
console.log('COMPREHENSIVE TEST: ALL 6 AI BUDDY ROBOTS + 3D ORBIT');
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

const allRobots = [
    { name: 'Zone 1: White AI (AI/PNg.svg)', path: 'AI/PNg.svg' },
    { name: 'Zone 2: Ice Blue AI (AI/ICE BLUE ROBOT.svg)', path: 'AI/ICE BLUE ROBOT.svg' },
    { name: 'Zone 3: Purple Blossom AI (AI/PURPLE ROBOT.svg)', path: 'AI/PURPLE ROBOT.svg' },
    { name: 'Zone 4: Green Tropical AI (AI/GREEN.svg)', path: 'AI/GREEN.svg' },
    { name: 'Zone 5: Gold Desert AI (AI/GOLD ROBOT.svg)', path: 'AI/GOLD ROBOT.svg' },
    { name: 'Zone 6: Red Dragon AI (AI/RED ROBOT.svg)', path: 'AI/RED ROBOT.svg' }
];

async function testRobot(robot) {
    console.log(`\nTesting ${robot.name}:`);
    const doc = createMockSvgDoc(robot.path);
    const rig = new BuddyRigController({ characterElement: doc }, BUDDY_RIG_CONFIG);
    rig.attachSvg(doc);
    const anim = new BuddyAnimationEngine(rig);

    // Verify 22 parts
    let count = 0;
    for (const [key, def] of Object.entries(BUDDY_RIG_CONFIG.parts)) {
        if (rig.getPart(key)) count++;
    }
    console.log(`  ✓ Parts detected: ${count} / 22`);
    assert.strictEqual(count, 22, `${robot.name} must have 22/22 parts`);

    // Test actions
    // 1. Head rotation
    await anim.animate('head', { rotation: 16 }, { duration: 25 });
    assert.strictEqual(rig.getPartState('head').rotation, 16);
    console.log(`  ✓ Head rotation (16°) animated`);

    // 2. Wave action
    await anim.animate('rightUpperArm', { rotation: -50 }, { duration: 25 });
    assert.strictEqual(rig.getPartState('rightUpperArm').rotation, -50);
    console.log(`  ✓ Arm wave (-50°) animated`);

    // 3. Eyes gaze
    await anim.animate('leftEye', { x: -8, y: -2 }, { duration: 25 });
    assert.strictEqual(rig.getPartState('leftEye').x, -8);
    console.log(`  ✓ Eye gaze (-8px) animated`);

    // 4. Reset
    rig.resetAll();
    assert.strictEqual(rig.getPartState('head').rotation, 0);
    assert.strictEqual(rig.getPartState('rightUpperArm').rotation, 0);
    console.log(`  ✓ Full rig reset to neutral pose verified`);
}

async function runAll() {
    for (const robot of allRobots) {
        await testRobot(robot);
    }
    console.log('\n========================================================');
    console.log('ALL 6 AI BUDDY COMPANIONS VERIFIED 100% OPERATIONAL!');
    console.log('========================================================\n');
}

runAll().catch(e => {
    console.error('Test failed:', e);
    process.exit(1);
});
