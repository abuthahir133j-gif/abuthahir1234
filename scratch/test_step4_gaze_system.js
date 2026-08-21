const assert = require('assert');
const {
    BuddyAnimationEngine,
    BuddyTimeline,
    BuddyAnimationState,
    BuddyRigController,
    BUDDY_RIG_CONFIG,
    GazeController,
    GazePoseCalculator,
    PointAction,
    TargetResolver
} = require('../src/components/TravelBuddy/index');

console.log('========================================================');
console.log('RUNNING STEP 4: LOOK / GAZE SYSTEM COMPREHENSIVE TESTS');
console.log('========================================================\n');

// Mock SVG Element & Document for Headless Node Environment
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

// Initialize Rig, Engine, GazeController, and PointAction
const rig = new BuddyRigController(mockScene, BUDDY_RIG_CONFIG);
rig.attachSvg(mockDoc);
const anim = new BuddyAnimationEngine(rig);
const gazeController = new GazeController(anim);
const pointAction = new PointAction(anim);

async function runTests() {
    // ----------------------------------------------------
    // TEST 1: LOOK LEFT
    // Expected: Eyes left, head subtly follows, no arm movement
    // ----------------------------------------------------
    console.log('TEST 1: LOOK LEFT (Target at x: 100, y: 350)');
    const leftTarget = { type: 'position', x: 100, y: 350 };
    const res1 = await gazeController.lookAt(leftTarget, { holdDuration: 40, speed: 10 });
    assert.strictEqual(res1.success, true, 'Look Left succeeded');
    assert.ok(res1.poseData.pose.leftEye.x < 0, 'Left eye moved left (negative x)');
    assert.ok(res1.poseData.pose.rightEye.x < 0, 'Right eye moved left (negative x)');
    assert.ok(res1.poseData.pose.head.rotation < 0, 'Head subtly rotated left (negative rotation)');
    
    // Verify arms remain strictly stationary
    const rArm1 = rig.getPartState('rightUpperArm');
    const lArm1 = rig.getPartState('leftUpperArm');
    const rForearm1 = rig.getPartState('rightForearm');
    const lForearm1 = rig.getPartState('leftForearm');
    const rHand1 = rig.getPartState('rightHand');
    const lHand1 = rig.getPartState('leftHand');
    assert.strictEqual(rArm1.rotation, 0, 'Right upper arm remained at 0 rotation');
    assert.strictEqual(lArm1.rotation, 0, 'Left upper arm remained at 0 rotation');
    assert.strictEqual(rForearm1.rotation, 0, 'Right forearm remained at 0 rotation');
    assert.strictEqual(lForearm1.rotation, 0, 'Left forearm remained at 0 rotation');
    assert.strictEqual(rHand1.rotation, 0, 'Right hand remained at 0 rotation');
    assert.strictEqual(lHand1.rotation, 0, 'Left hand remained at 0 rotation');
    console.log('  ✓ TEST 1 PASSED! (Eyes left, head rotated left, 0 arm movement)\n');

    // ----------------------------------------------------
    // TEST 2: LOOK RIGHT
    // Expected: Eyes right, head subtly follows
    // ----------------------------------------------------
    console.log('TEST 2: LOOK RIGHT (Target at x: 900, y: 350)');
    const rightTarget = { type: 'position', x: 900, y: 350 };
    const res2 = await gazeController.lookAt(rightTarget, { holdDuration: 40, speed: 10 });
    assert.strictEqual(res2.success, true, 'Look Right succeeded');
    assert.ok(res2.poseData.pose.leftEye.x > 0, 'Left eye moved right (positive x)');
    assert.ok(res2.poseData.pose.rightEye.x > 0, 'Right eye moved right (positive x)');
    assert.ok(res2.poseData.pose.head.rotation > 0, 'Head subtly rotated right (positive rotation)');
    console.log('  ✓ TEST 2 PASSED! (Eyes right, head rotated right)\n');

    // ----------------------------------------------------
    // TEST 3: LOOK UP
    // Expected: Eyes up, head follows within limits
    // ----------------------------------------------------
    console.log('TEST 3: LOOK UP (Target at x: 500, y: 50)');
    const upTarget = { type: 'position', x: 500, y: 50 };
    const res3 = await gazeController.lookAt(upTarget, { holdDuration: 40, speed: 10 });
    assert.strictEqual(res3.success, true, 'Look Up succeeded');
    assert.ok(res3.poseData.pose.leftEye.y < 0, 'Left eye moved up (negative y)');
    assert.ok(res3.poseData.pose.rightEye.y < 0, 'Right eye moved up (negative y)');
    assert.ok(Math.abs(res3.poseData.pose.leftEye.y) <= res3.poseData.limits.MAX_EYE_Y, 'Eye y within safe limits');
    assert.ok(Math.abs(res3.poseData.pose.head.rotation) <= res3.poseData.limits.MAX_HEAD_ROTATION, 'Head rotation within safe limits');
    console.log('  ✓ TEST 3 PASSED! (Eyes up, head follows within limits)\n');

    // ----------------------------------------------------
    // TEST 4: LOOK DOWN
    // Expected: Eyes down, head follows within limits
    // ----------------------------------------------------
    console.log('TEST 4: LOOK DOWN (Target at x: 500, y: 850)');
    const downTarget = { type: 'position', x: 500, y: 850 };
    const res4 = await gazeController.lookAt(downTarget, { holdDuration: 40, speed: 10 });
    assert.strictEqual(res4.success, true, 'Look Down succeeded');
    assert.ok(res4.poseData.pose.leftEye.y > 0, 'Left eye moved down (positive y)');
    assert.ok(res4.poseData.pose.rightEye.y > 0, 'Right eye moved down (positive y)');
    assert.ok(Math.abs(res4.poseData.pose.leftEye.y) <= res4.poseData.limits.MAX_EYE_Y, 'Eye y within safe limits');
    assert.ok(Math.abs(res4.poseData.pose.head.rotation) <= res4.poseData.limits.MAX_HEAD_ROTATION, 'Head rotation within safe limits');
    console.log('  ✓ TEST 4 PASSED! (Eyes down, head follows within limits)\n');

    // ----------------------------------------------------
    // TEST 5: LOOK CENTER / clearGaze()
    // Expected: Eyes and head return to neutral resting pose
    // ----------------------------------------------------
    console.log('TEST 5: LOOK CENTER / clearGaze()');
    await gazeController.clearGaze({ animated: true, duration: 40 });
    const headNeutral = rig.getPartState('head');
    const leftEyeNeutral = rig.getPartState('leftEye');
    const rightEyeNeutral = rig.getPartState('rightEye');
    const bodyNeutral = rig.getPartState('body');
    assert.strictEqual(headNeutral.rotation, 0, 'Head returned to exact neutral rotation 0');
    assert.strictEqual(leftEyeNeutral.x, 0, 'Left eye returned to exact neutral x 0');
    assert.strictEqual(leftEyeNeutral.y, 0, 'Left eye returned to exact neutral y 0');
    assert.strictEqual(rightEyeNeutral.x, 0, 'Right eye returned to exact neutral x 0');
    assert.strictEqual(rightEyeNeutral.y, 0, 'Right eye returned to exact neutral y 0');
    assert.strictEqual(bodyNeutral.rotation, 0, 'Body returned to exact neutral rotation 0');
    assert.strictEqual(gazeController.isActive, false, 'GazeController is inactive after clearGaze');
    assert.strictEqual(gazeController.lockedParts.length, 0, 'All parts unlocked');
    console.log('  ✓ TEST 5 PASSED! (Eyes and head return to neutral)\n');

    // ----------------------------------------------------
    // TEST 6: LOOK AT DOM ELEMENT
    // Expected: Buddy looks toward actual element bounding box
    // ----------------------------------------------------
    console.log('TEST 6: LOOK AT DOM ELEMENT');
    const mockElem = {
        id: 'gaze-test-target',
        getBoundingClientRect: () => ({ left: 820, top: 180, width: 120, height: 60 })
    };
    const resolvedElem = TargetResolver.resolve(mockElem);
    assert.strictEqual(resolvedElem.success, true);
    assert.strictEqual(resolvedElem.targetX, 880, 'Target center X computed from bounding rect');
    assert.strictEqual(resolvedElem.targetY, 210, 'Target center Y computed from bounding rect');

    const res6 = await gazeController.lookAt(mockElem, { speed: 10 });
    assert.strictEqual(res6.success, true);
    assert.ok(res6.poseData.pose.leftEye.x > 0, 'Eyes look right toward element');
    assert.ok(res6.poseData.pose.leftEye.y < 0, 'Eyes look up toward element');
    console.log('  ✓ TEST 6 PASSED! (Buddy looks toward actual element)\n');

    // ----------------------------------------------------
    // TEST 7: MOVE TARGET (DYNAMIC UPDATE)
    // Expected: Gaze updates correctly as target coordinates shift
    // ----------------------------------------------------
    console.log('TEST 7: MOVE TARGET (DYNAMIC UPDATE)');
    // Move target to left side
    mockElem.getBoundingClientRect = () => ({ left: 100, top: 600, width: 80, height: 50 });
    const res7 = await gazeController.updateTarget(mockElem, { speed: 10 });
    assert.strictEqual(res7.success, true);
    assert.ok(res7.poseData.pose.leftEye.x < 0, 'Eyes updated smoothly to look left');
    assert.ok(res7.poseData.pose.leftEye.y > 0, 'Eyes updated smoothly to look down');
    assert.ok(res7.poseData.pose.head.rotation < 0, 'Head updated to rotate left');
    console.log('  ✓ TEST 7 PASSED! (Gaze updates correctly with moving target)\n');

    // ----------------------------------------------------
    // TEST 8: LOOK -> POINT COMPATIBILITY
    // Expected: Point action can execute while gaze is active without breaking the arm rig
    // ----------------------------------------------------
    console.log('TEST 8: LOOK -> POINT COMPATIBILITY');
    await gazeController.lookAt({ x: 800, y: 300 }, { speed: 10 });
    const pointRes = await pointAction.execute({ target: { x: 800, y: 300 }, holdDuration: 40, speed: 10 });
    assert.strictEqual(pointRes.success, true, 'Point action executed smoothly after gaze');
    assert.ok(pointRes.poseData.pose.rightUpperArm.rotation < 0, 'Right arm elevated for pointing');
    console.log('  ✓ TEST 8 PASSED! (Point action works seamlessly after look)\n');

    // ----------------------------------------------------
    // TEST 9: POINT -> LOOK COMPATIBILITY
    // Expected: Animation ownership remains correct when transitioning from point to look
    // ----------------------------------------------------
    console.log('TEST 9: POINT -> LOOK COMPATIBILITY');
    const gazeAfterPoint = await gazeController.lookAt({ x: 150, y: 350 }, { speed: 10 });
    assert.strictEqual(gazeAfterPoint.success, true, 'Look executed after point returned');
    assert.ok(gazeAfterPoint.poseData.pose.head.rotation < 0, 'Head rotated left');
    const rArm9 = rig.getPartState('rightUpperArm');
    assert.strictEqual(rArm9.rotation, 0, 'Arm remains in neutral pose during look');
    console.log('  ✓ TEST 9 PASSED! (Animation ownership handoff is correct)\n');

    // ----------------------------------------------------
    // TEST 10: 20 REPEATED GAZE CYCLES (DRIFT TEST)
    // Expected: Exact 0.000 transform drift
    // ----------------------------------------------------
    console.log('TEST 10: 20 CONSECUTIVE GAZE CYCLES (ZERO DRIFT TEST)...');
    for (let i = 0; i < 20; i++) {
        const x = (i % 2 === 0) ? 850 : 120;
        const y = (i % 2 === 0) ? 150 : 650;
        await gazeController.lookAt({ x, y }, { speed: 25 });
        await gazeController.clearGaze({ animated: true, duration: 10, speed: 25 });
    }

    const finalHead = rig.getPartState('head');
    const finalLeftEye = rig.getPartState('leftEye');
    const finalRightEye = rig.getPartState('rightEye');
    const finalBody = rig.getPartState('body');
    const finalRArm = rig.getPartState('rightUpperArm');
    const finalLArm = rig.getPartState('leftUpperArm');

    assert.strictEqual(finalHead.rotation, 0, 'Head final rotation must be exact 0.000');
    assert.strictEqual(finalHead.y, 0, 'Head final y must be exact 0.000');
    assert.strictEqual(finalLeftEye.x, 0, 'Left eye final x must be exact 0.000');
    assert.strictEqual(finalLeftEye.y, 0, 'Left eye final y must be exact 0.000');
    assert.strictEqual(finalRightEye.x, 0, 'Right eye final x must be exact 0.000');
    assert.strictEqual(finalRightEye.y, 0, 'Right eye final y must be exact 0.000');
    assert.strictEqual(finalBody.rotation, 0, 'Body final rotation must be exact 0.000');
    assert.strictEqual(finalRArm.rotation, 0, 'Right upper arm final rotation must be exact 0.000');
    assert.strictEqual(finalLArm.rotation, 0, 'Left upper arm final rotation must be exact 0.000');

    // ----------------------------------------------------
    // TEST 11: LOOK AT SEMANTIC STRING NAMES ('USER', 'MAP', 'LEFT', 'RIGHT', 'UP', 'DOWN')
    // Expected: Resolves semantic keywords to proper viewport coordinates
    // ----------------------------------------------------
    console.log('TEST 11: LOOK AT SEMANTIC STRING NAMES');
    const gazeUser = await gazeController.lookAt('USER', { speed: 15 });
    assert.strictEqual(gazeUser.success, true, "lookAt('USER') resolved successfully");

    const gazeMap = await gazeController.lookAt('MAP', { speed: 15 });
    assert.strictEqual(gazeMap.success, true, "lookAt('MAP') resolved successfully");
    assert.ok(gazeMap.poseData.pose.head.rotation < 0, 'Head looks towards left quadrant map');

    const gazeNotif = await gazeController.lookAt('NOTIFICATION', { speed: 15 });
    assert.strictEqual(gazeNotif.success, true, "lookAt('NOTIFICATION') resolved successfully");

    const gazeDefault = await gazeController.lookAt(); // Default target
    assert.strictEqual(gazeDefault.success, true, 'lookAt() with no args resolved successfully');
    console.log('  ✓ TEST 11 PASSED! (Semantic keywords USER, MAP, NOTIFICATION, default resolve accurately)\n');

    console.log('========================================================');
    console.log('ALL STEP 4 LOOK / GAZE SYSTEM UNIT TESTS PASSED (11/11)!');
    console.log('========================================================');
}

runTests().catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
});
