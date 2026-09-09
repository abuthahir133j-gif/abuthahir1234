const assert = require('assert');
const BuddyOrbitControls = require('../src/components/TravelBuddy/BuddyOrbitControls');

console.log('========================================================');
console.log('RUNNING BUDDY 3D ORBIT CONTROLS TESTS');
console.log('========================================================\n');

// Mock DOM elements
class MockElement {
    constructor(id) {
        this.id = id;
        this.style = {};
        this.classList = {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        };
        this.listeners = {};
    }
    addEventListener(event, fn) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(fn);
    }
    removeEventListener(event, fn) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== fn);
        }
    }
    getBoundingClientRect() {
        return { left: 100, top: 100, width: 150, height: 150 };
    }
}

const mockChar = new MockElement('buddy-character-wrap');
const mockRoot = new MockElement('travel-buddy-root');
mockRoot.appendChild = (el) => {};

const mockScene = {
    characterElement: mockChar,
    rootElement: mockRoot
};

// 1. Initialize Orbit Controls
const orbit = new BuddyOrbitControls(mockScene, {
    defaultYaw: 12,
    defaultPitch: -6,
    defaultScale: 1.0,
    enableDamping: true
});

console.log('TEST 1: Initial state & 3D styling');
assert.strictEqual(orbit.yaw, 12, 'Default yaw should be 12');
assert.strictEqual(orbit.pitch, -6, 'Default pitch should be -6');
assert.strictEqual(orbit.scale, 1.0, 'Default scale should be 1.0');
assert.strictEqual(mockRoot.style.perspective, '1000px', 'Root perspective should be 1000px');
assert.strictEqual(mockChar.style.transformStyle, 'preserve-3d', 'Character should have preserve-3d');
assert.strictEqual(mockChar.classList.contains('orbit-controlled'), true, 'Should have orbit-controlled class');
console.log('  ✓ TEST 1 PASSED!\n');

console.log('TEST 2: Orbit dragging simulation');
orbit._onPointerDown({ clientX: 200, clientY: 200, cancelable: true });
assert.strictEqual(orbit.isDragging, true, 'Should be in dragging state');

orbit._onPointerMove({ clientX: 240, clientY: 180, cancelable: true });
assert.strictEqual(orbit.hasMoved, true, 'hasMoved should be true after dragging');
assert.ok(orbit.targetYaw > 12, 'Target yaw should have increased');
assert.ok(orbit.targetPitch > -6, 'Target pitch should have increased');

orbit._onPointerUp();
assert.strictEqual(orbit.isDragging, false, 'Should not be in dragging state after up');
console.log('  ✓ TEST 2 PASSED!\n');

console.log('TEST 3: Zoom / Wheel scaling');
const prevScale = orbit.targetScale;
orbit._onWheel({ deltaY: -100, preventDefault() {} });
assert.ok(orbit.targetScale > prevScale, 'Scroll up should zoom in (increase scale)');
orbit._onWheel({ deltaY: 100, preventDefault() {} });
assert.strictEqual(orbit.targetScale, prevScale, 'Scroll down should zoom out (decrease scale)');
console.log('  ✓ TEST 3 PASSED!\n');

console.log('TEST 4: Damping physics update');
orbit.targetYaw = 30;
orbit._update();
assert.ok(orbit.yaw > 12 && orbit.yaw < 30, 'Damping should smoothly interpolate yaw');
assert.ok(mockChar.style.transform.includes('perspective(1000px)'), 'Transform should have 3D perspective');
console.log('  ✓ TEST 4 PASSED!\n');

console.log('TEST 5: Reset to default 3D resting pose');
orbit.setAngles(45, -20, 1.4);
assert.strictEqual(orbit.targetYaw, 45);
assert.strictEqual(orbit.targetPitch, -20);
orbit.reset();
assert.strictEqual(orbit.targetYaw, 12, 'Reset should restore default yaw');
assert.strictEqual(orbit.targetPitch, -6, 'Reset should restore default pitch');
assert.strictEqual(orbit.targetScale, 1.0, 'Reset should restore default scale');
console.log('  ✓ TEST 5 PASSED!\n');

orbit.detach();
console.log('========================================================');
console.log('ALL BUDDY 3D ORBIT CONTROLS UNIT TESTS PASSED (5/5)!');
console.log('========================================================\n');
