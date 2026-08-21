# BUDDY_RIG_STEP1.MD — Controllable SVG Character Rig Architecture

## 1. Current Buddy Component Architecture
The Travel AI Buddy is a modular character system within the project. The component orchestration consists of:
- **`TravelBuddy.js`**: Master orchestrator exposing the high-level API, event bus bindings, proactive brain, memory layer, and developer debug panel. Exposes `travelBuddy.rig` (`BuddyRigController`).
- **`BuddyScene.js`**: Viewport renderer managing HTML/DOM layout, fetching/embedding the vector SVG (`AI/idle.svg`), binding speech UI, status badges, and attaching the SVG DOM to the Rig Controller.
- **`BuddyRigController.js`**: Central transformation and joint articulation manager.
- **`buddyRigConfig.js`**: Central configuration defining hierarchy, stable element IDs, pivot origins, and transformation constraints.
- **`TravelBuddy.css`**: Styling layer providing smooth transitions (`transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)`) and exact joint transform-origin bindings.

---

## 2. SVG Structure
The character is a sleek, floating anti-gravity robot companion rendered on a `600 × 600` canvas.
The SVG structure has been refined with stable semantic IDs without modifying any path coordinates, visual gloss, shaders, or neon cyan glows:
- `<svg id="buddy-root" viewBox="0 0 600 600">`
  - `<ellipse id="buddy-shadow" cx="300" cy="542" rx="85" ry="11" />`
  - `<g id="buddy-robot" transform="translate(0, 10)">`
    - `<g id="buddy-left-arm">` (Left Arm Assembly)
      - `<g id="buddy-left-upper-arm">` (Upper arm capsule)
      - `<g id="buddy-left-forearm">` (Inner shading / articulation)
      - `<g id="buddy-left-hand">` (Specular highlight & wrist tip)
    - `<g id="buddy-right-arm">` (Right Arm Assembly)
      - `<g id="buddy-right-upper-arm">` (Upper arm capsule)
      - `<g id="buddy-right-forearm">` (Inner shading / articulation)
      - `<g id="buddy-right-hand">` (Specular highlight & wrist tip)
    - `<g id="buddy-neck">` (Neck elliptical discs)
    - `<g id="buddy-body">` (Torso capsule, chest highlights, lower seam notch)
    - `<g id="buddy-head">` (Head assembly, rotating around neck base)
      - `<g id="buddy-top-cap">` (Antenna / cap)
      - `<g id="buddy-left-ear">` (Left ear capsule)
      - `<g id="buddy-right-ear">` (Right ear capsule)
      - `<g id="buddy-visor">` (Visor dark glass + inner radial glow)
      - `<g id="buddy-face-features">` (Glowing cyan visor features)
        - `<g id="buddy-left-eye">` (Left eye dome / arch)
        - `<g id="buddy-right-eye">` (Right eye dome / arch)
        - `<g id="buddy-mouth">` (Mouth smile / indicator)

---

## 3. Controllable Parts & Logical Hierarchy

```
buddy-root (300, 300)
│
├── buddy-shadow (300, 542)
│
└── buddy-robot (300, 300)
    │
    ├── buddy-neck (300, 270)
    │
    ├── buddy-body (300, 380)
    │
    ├── buddy-head (300, 260)  [Pivot: Neck Joint]
    │   ├── buddy-top-cap (300, 96)
    │   ├── buddy-left-ear (217, 175)
    │   ├── buddy-right-ear (383, 175)
    │   ├── buddy-visor (300, 178)
    │   └── buddy-face-features (300, 180)
    │       ├── buddy-left-eye (268, 176)
    │       ├── buddy-right-eye (332, 176)
    │       └── buddy-mouth (300, 188)
    │
    ├── buddy-left-arm (235, 295) [Group]
    │   ├── buddy-left-upper-arm (235, 295) [Pivot: Shoulder Joint]
    │   ├── buddy-left-forearm (210, 370)   [Pivot: Elbow Joint]
    │   └── buddy-left-hand (212, 445)      [Pivot: Wrist Joint]
    │
    └── buddy-right-arm (365, 295) [Group]
        ├── buddy-right-upper-arm (365, 295) [Pivot: Shoulder Joint]
        ├── buddy-right-forearm (390, 370)   [Pivot: Elbow Joint]
        └── buddy-right-hand (388, 445)      [Pivot: Wrist Joint]
```

*(Note: AI Buddy is an anti-gravity floating robot companion. Per guidelines, no artificial legs were added).*

---

## 4. Part IDs Table

| Part Name | Stable DOM ID | Parent Part | Default State |
|---|---|---|---|
| Buddy Root | `buddy-root` | `null` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Floor Shadow | `buddy-shadow` | `buddy-root` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Robot Body Frame | `buddy-robot` | `buddy-root` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Neck Joint | `buddy-neck` | `buddy-robot` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Torso / Body | `buddy-body` | `buddy-robot` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Head Assembly | `buddy-head` | `buddy-robot` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Top Cap / Antenna | `buddy-top-cap` | `buddy-head` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Ear | `buddy-left-ear` | `buddy-head` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Ear | `buddy-right-ear` | `buddy-head` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Visor Screen | `buddy-visor` | `buddy-head` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Face Group | `buddy-face-features` | `buddy-head` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Eye | `buddy-left-eye` | `buddy-face-features` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Eye | `buddy-right-eye` | `buddy-face-features` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Mouth | `buddy-mouth` | `buddy-face-features` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Arm (Full) | `buddy-left-arm` | `buddy-robot` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Upper Arm | `buddy-left-upper-arm` | `buddy-left-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Forearm | `buddy-left-forearm` | `buddy-left-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Left Hand | `buddy-left-hand` | `buddy-left-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Arm (Full) | `buddy-right-arm` | `buddy-robot` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Upper Arm | `buddy-right-upper-arm` | `buddy-right-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Forearm | `buddy-right-forearm` | `buddy-right-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |
| Right Hand | `buddy-right-hand` | `buddy-right-arm` | `{ rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }` |

---

## 5. Pivot Points & Joint Origins
Every part rotates strictly around its anatomical joint pivot in SVG 600x600 coordinates:
- **Head**: `(300px, 260px)` (base of skull / neck connection)
- **Left Shoulder (Upper Arm)**: `(235px, 295px)`
- **Left Elbow (Forearm)**: `(210px, 370px)`
- **Left Wrist (Hand)**: `(212px, 445px)`
- **Right Shoulder (Upper Arm)**: `(365px, 295px)`
- **Right Elbow (Forearm)**: `(390px, 370px)`
- **Right Wrist (Hand)**: `(388px, 445px)`
- **Left Eye**: `(268px, 176px)`
- **Right Eye**: `(332px, 176px)`
- **Mouth**: `(300px, 188px)`
- **Torso / Body**: `(300px, 380px)`
- **Neck**: `(300px, 270px)`
- **Shadow**: `(300px, 542px)`

---

## 6. Rig Architecture
```
┌────────────────────────────────────────────────────────┐
│                   TravelBuddy Master                   │
│      travelBuddy.rig = new BuddyRigController(scene)   │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     buddyRigConfig      │ │   BuddyRigController    │
│  - Hierarchical Tree    │ │  - getPart()            │
│  - Stable IDs           │ │  - setRotation()        │
│  - Joint Pivot Map      │ │  - setPosition()        │
│  - Angular Constraints  │ │  - setScale()           │
└─────────────────────────┘ │  - resetPart()/resetAll │
                            │  - State Storage Map    │
                            └────────────┬────────────┘
                                         ▼
                            ┌─────────────────────────┐
                            │    SVG DOM Canvas       │
                            │   #buddy-head           │
                            │   #buddy-left-upper-arm │
                            │   #buddy-right-hand     │
                            │   #buddy-left-eye...    │
                            └─────────────────────────┘
```

---

## 7. Controller API Reference

```javascript
// Retrieve part metadata, DOM element reference, and current transform state
const headPart = travelBuddy.rig.getPart('head');

// Rotate specific part around its joint pivot (degrees)
travelBuddy.rig.setRotation('head', -18);
travelBuddy.rig.setRotation('right-upper-arm', 35);
travelBuddy.rig.setRotation('left-hand', 20);

// Translate specific part independently (dx, dy in px)
travelBuddy.rig.setPosition('left-eye', -6, 2);
travelBuddy.rig.setPosition('right-eye', -6, 2);

// Scale part
travelBuddy.rig.setScale('head', 1.05, 1.05);

// Set opacity
travelBuddy.rig.setOpacity('shadow', 0.6);

// Atomic transform update
travelBuddy.rig.setTransform('head', {
    rotation: 12,
    x: 0,
    y: -4,
    scaleX: 1.02,
    scaleY: 1.02,
    opacity: 1
});

// Query state of a single part
const state = travelBuddy.rig.getPartState('left-upper-arm');
// => { rotation: 30, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }

// Query all part states
const allStates = travelBuddy.rig.getAllPartStates();

// Reset single part to neutral pose (0°, 0px, 0px, scale 1, opacity 1)
travelBuddy.rig.resetPart('head');

// Reset ALL parts to original neutral pose
travelBuddy.rig.resetAll();

// Subscribe to state change notifications (for devtools/UI)
const unsubscribe = travelBuddy.rig.onChange((states) => {
    console.log('Rig updated:', states);
});
```

---

## 8. Developer Test Panel
The developer test panel is built directly into the Developer Debug Panel (`#buddy-debug-panel`).
It includes:
1. **Live State Monitor**:
   - `Head Rot`: shows current head angle
   - `Left Arm (Upper/Fore/Hand)`: shows angles for upper arm, forearm, hand
   - `Right Arm (Upper/Fore/Hand)`: shows angles for upper arm, forearm, hand
   - `Eyes / Face (X, Y)`: shows offset of eyes
2. **Action Buttons**:
   - `[ HEAD LEFT ]` → `travelBuddy.rig.setRotation('head', -18)`
   - `[ HEAD RIGHT ]` → `travelBuddy.rig.setRotation('head', 18)`
   - `[ LEFT ARM ]` → `travelBuddy.rig.setRotation('left-upper-arm', 30)`
   - `[ RIGHT ARM ]` → `travelBuddy.rig.setRotation('right-upper-arm', -30)`
   - `[ LEFT HAND ]` → `travelBuddy.rig.setRotation('left-hand', 25)`
   - `[ RIGHT HAND ]` → `travelBuddy.rig.setRotation('right-hand', -25)`
   - `[ EYES LEFT ]` → `travelBuddy.rig.setPosition('leftEye', -8, 0); travelBuddy.rig.setPosition('rightEye', -8, 0);`
   - `[ EYES RIGHT ]` → `travelBuddy.rig.setPosition('leftEye', 8, 0); travelBuddy.rig.setPosition('rightEye', 8, 0);`
   - `[ Left Forearm ]` → `travelBuddy.rig.setRotation('left-forearm', 25)`
   - `[ Right Forearm ]` → `travelBuddy.rig.setRotation('right-forearm', -25)`
   - `[ Body Tilt ]` → `travelBuddy.rig.setRotation('body', 10)`
   - `[ RESET ALL ]` → `travelBuddy.rig.resetAll()`

---

## 9. Known Limitations
- The original design is a minimalist floating companion capsule without individual multi-segment skeleton fingers. Pointing is executed via whole arm + forearm + wrist orientation pointing towards the target.
- The floating capsule robot does not have legs (it floats above a shadow plane); leg joint controllers are intentionally omitted to avoid fabricating non-existent geometry.

---

## 10. Recommendations for Step 2
In Step 2 (Action Choreography & Kinematics):
1. Build an inverse/forward kinematics action sequencer that coordinates multi-joint poses for compound actions:
   - **POINT**: Head tilts + Eyes look at target coordinate + Right Shoulder rotates up + Forearm angles forward + Hand aligns.
   - **WAVE**: Upper arm elevates + Forearm oscillates rhythmically + Head tilts playfully + Eyes smile.
   - **THINK**: Head cocks sideways + Hand reaches toward chin/visor + Eyes look upward + Subtle torso lean.
   - **CELEBRATE**: Both arms raise in celebration + Torso bounces + Head tilts up + Eyes flash excited sparkles.
2. Ensure gesture transitions interpolate smoothly over configurable easing curves (e.g. spring or easeOutBack) via `BuddyRigController.setTransform()`.
