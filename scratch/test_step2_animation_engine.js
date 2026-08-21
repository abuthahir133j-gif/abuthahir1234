const assert = require('assert');
const {
    BuddyAnimationEngine,
    BuddyTimeline,
    BuddyAnimationState,
    BuddyRigController,
    BUDDY_RIG_CONFIG
} = require('../src/components/TravelBuddy/index');

console.log('========================================================');
console.log('RUNNING STEP 2: BUDDY ANIMATION ENGINE COMPREHENSIVE TESTS');
console.log('========================================================\n');

// Mock SVG Element with style and setAttribute for Node environment testing
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
        if (!this.elements[id]) {
            this.elements[id] = new MockSVGElement(id);
        }
        return this.elements[id];
    },
    querySelector(sel) {
        const id = sel.replace('#', '');
        return this.getElementById(id);
    }
};

const mockScene = {
    characterElement: {
        querySelector: (sel) => mockDoc.querySelector(sel)
    }
};

// 1. Initialize Rig & Animation Engine
const rig = new BuddyRigController(mockScene, BUDDY_RIG_CONFIG);
rig.attachSvg(mockDoc);

const anim = new BuddyAnimationEngine(rig);

async function runTests() {
    // ----------------------------------------------------
    // TEST A: Neutral -> Head rotates -> Reset -> Neutral
    // ----------------------------------------------------
    console.log('TEST A: Neutral -> Head rotates -> Reset');
    const neutralHead = anim.getNeutralPose('head');
    assert.strictEqual(neutralHead.rotation, 0, 'Initial neutral head rotation should be 0');

    await anim.animate('head', { rotation: 22 }, { duration: 50 });
    const headState1 = rig.getPartState('head');
    assert.strictEqual(Math.round(headState1.rotation), 22, 'Head should reach 22 deg');

    await anim.resetPart('head');
    const headStateReset = rig.getPartState('head');
    assert.strictEqual(headStateReset.rotation, 0, 'Head should return to exact 0 deg');
    console.log('  ✓ TEST A PASSED!\n');

    // ----------------------------------------------------
    // TEST B: Neutral -> Right upper arm rotates -> Reset
    // ----------------------------------------------------
    console.log('TEST B: Neutral -> Right upper arm rotates -> Reset');
    await anim.animate('rightUpperArm', { rotation: -35 }, { duration: 50 });
    const rarmState1 = rig.getPartState('rightUpperArm');
    assert.strictEqual(Math.round(rarmState1.rotation), -35, 'Right upper arm should reach -35 deg');

    await anim.resetPart('rightUpperArm');
    const rarmReset = rig.getPartState('rightUpperArm');
    assert.strictEqual(rarmReset.rotation, 0, 'Right upper arm should return to exact 0 deg');
    console.log('  ✓ TEST B PASSED!\n');

    // ----------------------------------------------------
    // TEST C: Neutral -> Right forearm rotates -> Reset
    // ----------------------------------------------------
    console.log('TEST C: Neutral -> Right forearm rotates -> Reset');
    await anim.animate('rightForearm', { rotation: -45 }, { duration: 50 });
    const rForearmState = rig.getPartState('rightForearm');
    assert.strictEqual(Math.round(rForearmState.rotation), -45, 'Right forearm should reach -45 deg around elbow pivot');

    await anim.resetPart('rightForearm');
    assert.strictEqual(rig.getPartState('rightForearm').rotation, 0, 'Right forearm should return to exact 0 deg');
    console.log('  ✓ TEST C PASSED!\n');

    // ----------------------------------------------------
    // TEST D: Head + Eyes + Right Arm simultaneously (Parallel)
    // ----------------------------------------------------
    console.log('TEST D: Parallel animation of Head + Eyes + Right Arm');
    await anim.parallel([
        { part: 'head', properties: { rotation: 15 }, duration: 60 },
        { part: 'leftEye', properties: { x: 7, y: -3 }, duration: 60 },
        { part: 'rightEye', properties: { x: 7, y: -3 }, duration: 60 },
        { part: 'rightUpperArm', properties: { rotation: -30 }, duration: 60 }
    ]);

    assert.strictEqual(Math.round(rig.getPartState('head').rotation), 15, 'Head rotated in parallel');
    assert.strictEqual(Math.round(rig.getPartState('leftEye').x), 7, 'Left eye translated X in parallel');
    assert.strictEqual(Math.round(rig.getPartState('rightUpperArm').rotation), -30, 'Right upper arm rotated in parallel');

    await anim.resetAll();
    assert.strictEqual(rig.getPartState('head').rotation, 0);
    assert.strictEqual(rig.getPartState('leftEye').x, 0);
    assert.strictEqual(rig.getPartState('rightUpperArm').rotation, 0);
    console.log('  ✓ TEST D PASSED!\n');

    // ----------------------------------------------------
    // TEST E: Animation Interrupt (Start A -> Cancel/Start B)
    // ----------------------------------------------------
    console.log('TEST E: Animation Interrupt (Start A -> Interrupt with B)');
    const p1 = anim.animate('head', { rotation: 40 }, { duration: 200 });
    // Interrupt halfway
    setTimeout(async () => {
        await anim.animate('head', { rotation: -20 }, { duration: 60 });
        assert.strictEqual(Math.round(rig.getPartState('head').rotation), -20, 'Head successfully re-targeted to -20 deg without broken transforms');
        await anim.resetPart('head');
        console.log('  ✓ TEST E PASSED!\n');
    }, 50);

    await new Promise(r => setTimeout(r, 250));

    // ----------------------------------------------------
    // TEST F: Transform Drift Prevention (20 cycles)
    // ----------------------------------------------------
    console.log('TEST F: Testing Transform Drift over 20 repeated cycles...');
    for (let i = 0; i < 20; i++) {
        await anim.animate('head', { rotation: 18, x: 5, y: -2 }, { duration: 10 });
        await anim.resetPart('head');
        
        await anim.animate('rightUpperArm', { rotation: -35 }, { duration: 10 });
        await anim.resetPart('rightUpperArm');

        await anim.animate('rightHand', { rotation: -25 }, { duration: 10 });
        await anim.resetPart('rightHand');
    }

    const finalHead = rig.getPartState('head');
    const finalArm = rig.getPartState('rightUpperArm');
    const finalHand = rig.getPartState('rightHand');

    assert.strictEqual(finalHead.rotation, 0, 'Head final rotation must be 0.000 after 20 cycles');
    assert.strictEqual(finalHead.x, 0, 'Head final x must be 0.000 after 20 cycles');
    assert.strictEqual(finalHead.y, 0, 'Head final y must be 0.000 after 20 cycles');
    assert.strictEqual(finalArm.rotation, 0, 'Right arm final rotation must be 0.000');
    assert.strictEqual(finalHand.rotation, 0, 'Right hand final rotation must be 0.000');
    console.log('  ✓ TEST F PASSED! Zero transform drift detected.\n');

    // ----------------------------------------------------
    // TEST G: Error Handling for Non-Existent Part
    // ----------------------------------------------------
    console.log('TEST G: Error handling for missing part');
    let errorThrown = false;
    try {
        await anim.animate('nonExistentFingerPart', { rotation: 10 }, { duration: 20 });
    } catch (e) {
        errorThrown = true;
    }
    assert.strictEqual(errorThrown, false, 'Missing part should log warning and not throw or crash');
    console.log('  ✓ TEST G PASSED!\n');

    // ----------------------------------------------------
    // TEST H: Timeline Keyframing & Sequencing
    // ----------------------------------------------------
    console.log('TEST H: Timeline multi-track sequencing');
    const tl = anim.createTimeline({ duration: 150 });
    tl.add(0, 'leftEye', { x: 5 })
      .add(30, 'head', { rotation: 10 })
      .add(60, 'rightUpperArm', { rotation: -20 });

    await tl.play();
    assert.strictEqual(Math.round(rig.getPartState('leftEye').x), 5);
    assert.strictEqual(Math.round(rig.getPartState('head').rotation), 10);
    assert.strictEqual(Math.round(rig.getPartState('rightUpperArm').rotation), -20);
    await anim.resetAll();
    console.log('  ✓ TEST H PASSED!\n');

    console.log('========================================================');
    console.log('ALL STEP 2 ANIMATION ENGINE UNIT TESTS PASSED (8/8)!');
    console.log('========================================================');
}

runTests().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
