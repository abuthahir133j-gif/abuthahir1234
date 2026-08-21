const assert = require('assert');
const {
    BuddyAnimationEngine,
    BuddyTimeline,
    BuddyAnimationState,
    BuddyRigController,
    BUDDY_RIG_CONFIG
} = require('../src/components/TravelBuddy/index');

const TargetResolver = require('../src/character/buddy/actions/TargetResolver');
const PointPoseCalculator = require('../src/character/buddy/actions/PointPoseCalculator');
const PointAction = require('../src/character/buddy/actions/PointAction');

console.log('========================================================');
console.log('RUNNING STEP 3: NATURAL POINT ACTION COMPREHENSIVE TESTS');
console.log('========================================================\n');

// Mock SVG Element and Mock DOM for Headless Testing
class MockSVGElement {
    constructor(id) {
        this.id = id;
        this.style = {};
        this.attributes = {};
    }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
}

const mockDoc = {
    elements: {},
    getElementById(id) {
        if (typeof id === 'string' && id.startsWith('buddy-')) {
            if (!this.elements[id]) {
                this.elements[id] = new MockSVGElement(id);
            }
            return this.elements[id];
        }
        return this.elements[id] || null;
    },
    querySelector(sel) {
        const id = sel.replace('#', '');
        return this.getElementById(id);
    }
};

global.document = mockDoc;

const mockScene = {
    characterElement: {
        querySelector: (sel) => mockDoc.querySelector(sel)
    }
};

// Initialize Rig & Animation Engine
const rig = new BuddyRigController(mockScene, BUDDY_RIG_CONFIG);
rig.attachSvg(mockDoc);
const anim = new BuddyAnimationEngine(rig);
const pointAction = new PointAction(anim);

async function runTests() {
    // ----------------------------------------------------
    // TEST 1: POINT RIGHT
    // ----------------------------------------------------
    console.log('TEST 1: POINT RIGHT (Target at x: 800, y: 300)');
    const rightTarget = { type: 'position', x: 800, y: 300 };
    const res1 = await pointAction.execute({ target: rightTarget, holdDuration: 40 });
    assert.strictEqual(res1.success, true, 'Point Right execution succeeded');
    assert.strictEqual(res1.targetData.pointingArm, 'right', 'Right arm selected for screen right target');
    assert.ok(res1.poseData.pose.head.rotation > 0, 'Head rotated positive (right)');
    assert.ok(res1.poseData.pose.rightUpperArm.rotation < 0, 'Right upper arm rotated into elevation (negative degrees)');
    console.log('  ✓ TEST 1 PASSED!\n');

    // ----------------------------------------------------
    // TEST 2: POINT LEFT
    // ----------------------------------------------------
    console.log('TEST 2: POINT LEFT (Target at x: 100, y: 300)');
    const leftTarget = { type: 'position', x: 100, y: 300 };
    const res2 = await pointAction.execute({ target: leftTarget, holdDuration: 40 });
    assert.strictEqual(res2.success, true, 'Point Left execution succeeded');
    assert.strictEqual(res2.targetData.pointingArm, 'left', 'Left arm selected for screen left target');
    assert.ok(res2.poseData.pose.head.rotation < 0, 'Head rotated negative (left)');
    assert.ok(res2.poseData.pose.leftUpperArm.rotation > 0, 'Left upper arm rotated into elevation (positive degrees)');
    console.log('  ✓ TEST 2 PASSED!\n');

    // ----------------------------------------------------
    // TEST 3: POINT UP
    // ----------------------------------------------------
    console.log('TEST 3: POINT UP (Target at x: 500, y: 80)');
    const upTarget = { type: 'position', x: 500, y: 80 };
    const res3 = await pointAction.execute({ target: upTarget, holdDuration: 40 });
    assert.strictEqual(res3.success, true, 'Point Up execution succeeded');
    assert.ok(Math.abs(res3.poseData.pose.rightUpperArm.rotation) >= 40, 'Elevated upper arm angle for high target');
    console.log('  ✓ TEST 3 PASSED!\n');

    // ----------------------------------------------------
    // TEST 4: POINT DOWN
    // ----------------------------------------------------
    console.log('TEST 4: POINT DOWN (Target at x: 500, y: 800)');
    const downTarget = { type: 'position', x: 500, y: 800 };
    const res4 = await pointAction.execute({ target: downTarget, holdDuration: 40 });
    assert.strictEqual(res4.success, true, 'Point Down execution succeeded');
    assert.ok(Math.abs(res4.poseData.pose.rightUpperArm.rotation) <= 35, 'Lowered upper arm angle for down target');
    console.log('  ✓ TEST 4 PASSED!\n');

    // ----------------------------------------------------
    // TEST 5 & 6: POINT TO DOM ELEMENT & MOVE TARGET
    // ----------------------------------------------------
    console.log('TEST 5 & 6: TargetResolver with DOM Element & Dynamic Movement');
    const mockElement = {
        id: 'hotel-card-1',
        getBoundingClientRect: () => ({ left: 750, top: 220, width: 200, height: 100 })
    };
    const resolved5 = TargetResolver.resolve({ type: 'element', targetId: 'hotel-card-1' }, null);
    // When element not in global document, pass object or element directly
    const resolvedElem = TargetResolver.resolve(mockElement);
    assert.strictEqual(resolvedElem.success, true);
    assert.strictEqual(resolvedElem.targetX, 850, 'Target center X computed correctly');
    assert.strictEqual(resolvedElem.targetY, 270, 'Target center Y computed correctly');

    // Move mock element to new location
    mockElement.getBoundingClientRect = () => ({ left: 80, top: 400, width: 100, height: 100 });
    const resolvedMoved = TargetResolver.resolve(mockElement);
    assert.strictEqual(resolvedMoved.targetX, 130, 'Moved target center X computed correctly');
    assert.strictEqual(resolvedMoved.pointingArm, 'left', 'Switching to left arm after moving to left side');
    console.log('  ✓ TEST 5 & 6 PASSED!\n');

    // ----------------------------------------------------
    // TEST 7: POINT INTERRUPT
    // ----------------------------------------------------
    console.log('TEST 7: Point Action Interruption');
    const p1 = pointAction.execute({ target: { x: 700, y: 200 }, holdDuration: 500 });
    setTimeout(() => {
        pointAction.cancel();
        assert.strictEqual(pointAction.isActive, false, 'Point action marked inactive on cancel');
        assert.strictEqual(pointAction.lockedParts.length, 0, 'Locked parts released on cancel');
    }, 50);
    await new Promise(r => setTimeout(r, 200));
    console.log('  ✓ TEST 7 PASSED!\n');

    // ----------------------------------------------------
    // TEST 8: 20 CONSECUTIVE POINT CYCLES (DRIFT TEST)
    // ----------------------------------------------------
    console.log('TEST 8: Testing Transform Drift over 20 consecutive point cycles...');
    for (let i = 0; i < 20; i++) {
        const x = (i % 2 === 0) ? 750 : 120;
        await pointAction.execute({ target: { x, y: 300 }, holdDuration: 5, speed: 20 });
    }

    const finalHead = rig.getPartState('head');
    const finalRArm = rig.getPartState('rightUpperArm');
    const finalLArm = rig.getPartState('leftUpperArm');
    const finalBody = rig.getPartState('body');
    const finalLeftEye = rig.getPartState('leftEye');

    assert.strictEqual(finalHead.rotation, 0, 'Head final rotation must be exact 0.000');
    assert.strictEqual(finalRArm.rotation, 0, 'Right arm final rotation must be exact 0.000');
    assert.strictEqual(finalLArm.rotation, 0, 'Left arm final rotation must be exact 0.000');
    assert.strictEqual(finalBody.rotation, 0, 'Body final rotation must be exact 0.000');
    assert.strictEqual(finalLeftEye.x, 0, 'Left eye final x must be exact 0.000');
    console.log('  ✓ TEST 8 PASSED! Zero transform drift after 20 cycles.\n');

    // ----------------------------------------------------
    // TEST 9: MISSING TARGET ERROR HANDLING
    // ----------------------------------------------------
    console.log('TEST 9: Error handling for missing target');
    const missingRes = await pointAction.execute({ target: { type: 'element', targetId: 'non-existent-hotel' } });
    assert.strictEqual(missingRes.success, false, 'Gracefully returned failure');
    assert.strictEqual(missingRes.reason, 'TARGET_NOT_FOUND', 'Correct error reason');
    console.log('  ✓ TEST 9 PASSED!\n');

    // ----------------------------------------------------
    // TEST 10: PART LOCKING & OWNERSHIP
    // ----------------------------------------------------
    console.log('TEST 10: Part locking during point execution');
    const pointPromise = pointAction.execute({ target: { x: 750, y: 300 }, holdDuration: 100 });
    // Check that parts are locked while active
    assert.ok(pointAction.lockedParts.includes('head'), 'Head is locked during point');
    assert.ok(pointAction.lockedParts.includes('rightUpperArm'), 'Right upper arm is locked during point');
    await pointPromise;
    assert.strictEqual(pointAction.lockedParts.length, 0, 'All parts unlocked after completion');
    console.log('  ✓ TEST 10 PASSED!\n');

    console.log('========================================================');
    console.log('ALL STEP 3 POINT ACTION UNIT TESTS PASSED (10/10)!');
    console.log('========================================================');
}

runTests().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
