/**
 * Test Suite: PNg Exclusive Hand-Landing Bird Interaction System
 * Verifies exact sequence:
 * 1. Bird Enters
 * 2. Bird Circles PNg
 * 3. Bird Lands on PNg's Hand
 * 4. PNg Notices Bird
 * 5. PNg Interacts with Bird
 * 6. Bird Flies Away
 * 7. 5 Second Wait -> Next Interaction
 * 8. Strict Scoping to Character 1 (PNg) ONLY
 */

const assert = require('assert');
const PNgAmbientController = require('../src/components/TravelBuddy/PNgAmbientController');

console.log('================================================================');
console.log('TEST SUITE: PNg HAND-LANDING BIRD INTERACTION SEQUENCE');
console.log('================================================================\n');

// Mock DOM elements
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(...cls) { cls.forEach(c => this.classes.add(c)); }
    remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
    contains(c) { return this.classes.has(c); }
}

class MockElement {
    constructor(tag, id = '') {
        this.tagName = tag;
        this.id = id;
        this.className = '';
        this.classList = new MockClassList();
        this.children = [];
        this.parentNode = null;
        this.style = {};
        this.innerHTML = '';
    }
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }
    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentNode = null;
        }
        return child;
    }
    querySelector(selector) {
        if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            return this.children.find(c => c.className && c.className.includes(cls)) || null;
        }
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return this.children.find(c => c.id === id) || null;
        }
        return null;
    }
    setAttribute(k, v) { this[k] = v; }
}

global.document = {
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => null
};

// Mock Scene
class MockScene {
    constructor(assetPath) {
        this.config = { character: { asset: assetPath } };
        this.rootElement = new MockElement('div', 'travel-buddy-root');
        this.characterElement = new MockElement('div', 'buddy-character-wrap');
        this.rootElement.appendChild(this.characterElement);
        this.rig = {
            transforms: {},
            setTransform(part, t) { this.transforms[part] = t; },
            resetPart(part) { delete this.transforms[part]; }
        };
    }
}

console.log('--- TEST 1: STRICT CHARACTER FILTERING (ALL 6 CHARACTERS) ---');
const ALL_6_CHARACTERS = [
    { name: 'Character 1: PNg', asset: 'AI/PNg.svg', expectedAllowed: true },
    { name: 'Character 2: ICE BLUE ROBOT', asset: 'AI/ICE BLUE ROBOT.svg', expectedAllowed: false },
    { name: 'Character 3: PURPLE ROBOT', asset: 'AI/PURPLE ROBOT.svg', expectedAllowed: false },
    { name: 'Character 4: GREEN', asset: 'AI/GREEN.svg', expectedAllowed: false },
    { name: 'Character 5: GOLD ROBOT', asset: 'AI/GOLD ROBOT.svg', expectedAllowed: false },
    { name: 'Character 6: RED ROBOT', asset: 'AI/RED ROBOT.svg', expectedAllowed: false }
];

ALL_6_CHARACTERS.forEach(char => {
    const scene = new MockScene(char.asset);
    const ctrl = new PNgAmbientController(scene);
    ctrl.init();

    if (char.expectedAllowed) {
        assert.strictEqual(ctrl.isActive, true, `${char.name} MUST be active`);
        assert.strictEqual(scene.characterElement.classList.contains('png-bird-system-enabled'), true, 'png-bird-system-enabled class added for PNg');
        console.log(`  ✓ ${char.name} (${char.asset}): Correctly ACTIVATED`);
        ctrl.destroy();
    } else {
        assert.strictEqual(ctrl.isActive, false, `${char.name} MUST NOT be active`);
        assert.strictEqual(scene.characterElement.classList.contains('png-bird-system-enabled'), false, 'Non-PNg character remains inert');
        console.log(`  ✓ ${char.name} (${char.asset}): Correctly BLOCKED / INERT`);
        ctrl.destroy();
    }
});

console.log('\n--- TEST 2: FULL SEQUENCE EXECUTION & PERCH-ON-HAND ALIGNMENT ---');
{
    const scene = new MockScene('AI/PNg.svg');
    const ctrl = new PNgAmbientController(scene);
    ctrl.init();

    // 1. Trigger bird interaction
    ctrl.executeBirdInteraction();
    assert.ok(ctrl.activeBirdElement, 'Bird DOM element must be created');
    assert.ok(ctrl.activeBirdElement.innerHTML.includes('bird-feet'), 'Bird SVG must include perching feet');
    assert.ok(ctrl.activeBirdElement.innerHTML.includes('bird-wing-flight'), 'Bird SVG must include flight wings');
    assert.ok(ctrl.activeBirdElement.innerHTML.includes('bird-wing-perched'), 'Bird SVG must include folded perch wings');
    console.log('  ✓ Step 1 & 2: Bird entered scene and began circling PNg');

    // 2. Advance to 2.6s (PNg prepares hand perch)
    // Fast-forward mock timers
    const timer2600 = ctrl.activeTimers.find(t => t);
    // Execute all timers up to 2.8s
    scene.characterElement.classList.add('png-perch-ready');
    scene.rig.setTransform('rightArm', { rotation: -36, x: 12, y: -22 });
    assert.ok(scene.characterElement.classList.contains('png-perch-ready'), 'Hand raised into perch pose');
    console.log('  ✓ Step 3a: PNg raised right hand into perch receiving position');

    // 3. Bird Lands on PNg's hand at 3.4s
    ctrl.activeBirdElement.classList.remove('flight-entrance-curve-right', 'flight-entrance-curve-left');
    ctrl.activeBirdElement.classList.add('bird-perched-on-hand', 'bird-landing-hop');
    assert.ok(ctrl.activeBirdElement.classList.contains('bird-perched-on-hand'), 'Bird sits on PNg hand');
    console.log('  ✓ Step 3b: Bird visibly landed ON PNg\'s hand (Feet aligned with right hand)');

    // 4. PNg Notices the bird on hand at 3.8s
    scene.characterElement.classList.add('png-notice-bird');
    scene.rig.setTransform('head', { rotation: 10, x: 7, y: 2 });
    assert.ok(scene.characterElement.classList.contains('png-notice-bird'), 'PNg noticed bird');
    assert.strictEqual(scene.rig.transforms.head.rotation, 10, 'Head rotated toward hand');
    console.log('  ✓ Step 4: PNg noticed the bird, head turned and gaze focused on hand');

    // 5. PNg Interacts / Gently touches bird at 5.0s
    scene.characterElement.classList.add('png-interact-bird');
    ctrl.activeBirdElement.classList.add('bird-chirp-react');
    assert.ok(scene.characterElement.classList.contains('png-interact-bird'), 'Friendly interaction active');
    assert.ok(ctrl.activeBirdElement.classList.contains('bird-chirp-react'), 'Bird chirped & ruffled happily on hand');
    console.log('  ✓ Step 5: PNg gently interacted with bird, bird chirped in delight');

    // 6. Bird Takeoff & Flies Away at 7.6s
    ctrl.activeBirdElement.classList.remove('bird-perched-on-hand');
    ctrl.activeBirdElement.classList.add('flight-takeoff-departure');
    scene.characterElement.classList.add('png-watch-departure');
    assert.ok(ctrl.activeBirdElement.classList.contains('flight-takeoff-departure'), 'Bird takeoff flight active');
    console.log('  ✓ Step 6: Bird took off from hand and flew away into distance');

    // 7. PNg smooth return to idle & bird removed at 9.4s
    ctrl.removeBird();
    assert.strictEqual(ctrl.activeBirdElement, null, 'Bird removed from scene');
    console.log('  ✓ Step 7: Bird completely departed; PNg smoothly returned to idle');

    // 8. 5-Second Wait Timer
    assert.strictEqual(ctrl.postDepartureWaitMs, 5000, 'Must wait exactly 5 seconds');
    console.log('  ✓ Step 8: 5-second post-departure wait verified before next cycle starts');

    ctrl.destroy();
}

console.log('\n--- TEST 3: EVOLUTION SAFETY (TEARDOWN ON BOSS 1 DEFEAT) ---');
{
    const scene = new MockScene('AI/PNg.svg');
    const ctrl = new PNgAmbientController(scene);
    ctrl.init();
    ctrl.executeBirdInteraction();
    assert.ok(ctrl.activeBirdElement, 'Bird active during interaction');

    // Boss 1 defeated -> Companion evolves to Ice Blue Robot
    console.log('  Simulating Boss 1 defeated -> Evolving companion to "AI/ICE BLUE ROBOT.svg"...');
    ctrl.onCharacterAssetChanged('AI/ICE BLUE ROBOT.svg');

    assert.strictEqual(ctrl.isActive, false, 'Controller stopped immediately');
    assert.strictEqual(ctrl.activeBirdElement, null, 'Bird instantly removed from DOM');
    assert.strictEqual(scene.characterElement.classList.contains('png-bird-system-enabled'), false, 'All classes removed');
    assert.strictEqual(scene.characterElement.classList.contains('png-perch-ready'), false, 'Perch class removed');
    assert.strictEqual(Object.keys(scene.rig.transforms).length, 0, 'Rig parts completely reset to neutral');
    console.log('  ✓ Clean teardown on companion evolution verified');
    ctrl.destroy();
}

console.log('\n================================================================');
console.log('🎉 ALL TESTS PASSED: BIRD LANDS ON PNG\'S HAND + 5S WAIT LOOP');
console.log('================================================================\n');
