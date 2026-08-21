/**
 * Travel AI Buddy — Step 1: Central Buddy Rig Controller
 * 
 * Manages independent joint transformations (rotation, translation, scale, opacity)
 * for each individual body part of the Buddy SVG character.
 * 
 * Provides:
 * - getPart(partKey)
 * - setRotation(partKey, degrees)
 * - setPosition(partKey, x, y)
 * - setScale(partKey, scaleX, scaleY)
 * - setOpacity(partKey, opacity)
 * - setTransform(partKey, stateObj)
 * - getPartState(partKey)
 * - getAllPartStates()
 * - resetPart(partKey)
 * - resetAll()
 * - onChange(callback)
 */
(function (global) {
    const _BUDDY_RIG_CONFIG = (typeof global.BUDDY_RIG_CONFIG !== 'undefined')
        ? global.BUDDY_RIG_CONFIG
        : (typeof require !== 'undefined' ? (require('./buddyRigConfig').BUDDY_RIG_CONFIG || require('./buddyRigConfig')) : {});

    class BuddyRigController {
        constructor(scene = null, config = _BUDDY_RIG_CONFIG) {
            this.scene = scene;
            this.config = (config && config.parts) ? config : (config?.BUDDY_RIG_CONFIG || _BUDDY_RIG_CONFIG);
            this.svgElement = null;

            // Element DOM Cache: key -> SVGElement
            this.elementCache = new Map();

            // Part State Store: key -> { rotation, x, y, scaleX, scaleY, opacity }
            this.states = new Map();

            // Initialize all defined part states to default
            this.initDefaultStates();

            this.listeners = new Set();

            if (this.scene) {
                this.attachScene(this.scene);
            }
        }

        validateCharacterAsset(assetPath) {
            const expected = this.config.character?.asset || 'AI/png.svg';
            if (assetPath && assetPath !== expected && assetPath !== 'AI/PNg.svg') {
                console.warn(`[BuddyRigController] Character replacement blocked. Buddy must use ${expected}. Attempted: ${assetPath}`);
                return false;
            }
            return true;
        }

        initDefaultStates() {
            this.states.clear();
            for (const [key, partDef] of Object.entries(this.config.parts)) {
                this.states.set(key, { ...(partDef.defaultState || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }) });
            }
        }

        resolvePartKey(partKey) {
            if (!partKey) return null;
            const normalized = String(partKey).trim();
            if (this.config.parts[normalized]) return normalized;
            if (this.config.aliases && this.config.aliases[normalized]) {
                return this.config.aliases[normalized];
            }
            // Try lowercased / stripped
            const stripped = normalized.toLowerCase().replace(/_/g, '-');
            if (this.config.aliases && this.config.aliases[stripped]) {
                return this.config.aliases[stripped];
            }
            return null;
        }

        attachScene(scene) {
            this.scene = scene;
            if (scene && scene.svgElement) {
                this.attachSvg(scene.svgElement);
            }
        }

        attachSvg(svgElement) {
            if (!svgElement) return;
            this.svgElement = svgElement;
            this.elementCache.clear();

            // Cache DOM references and apply pivot transform origins
            for (const [key, partDef] of Object.entries(this.config.parts)) {
                const el = svgElement.querySelector(`#${partDef.id}`);
                if (el) {
                    this.elementCache.set(key, el);
                    // Configure exact transform origin for joint pivot
                    if (partDef.pivot) {
                        el.style.transformOrigin = `${partDef.pivot.x}px ${partDef.pivot.y}px`;
                    }
                }
            }

            // Apply all currently buffered states to the newly attached SVG
            this.applyAllTransforms();
            console.log(`[BuddyRigController] Rig attached with ${this.elementCache.size}/${Object.keys(this.config.parts).length} parts detected.`);
        }

        getPart(partKey) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) {
                console.warn(`[BuddyRigController] Unknown body part "${partKey}".`);
                return null;
            }

            // Ensure cached
            let el = this.elementCache.get(resolved);
            if (!el && this.svgElement) {
                const partDef = this.config.parts[resolved];
                if (partDef) {
                    el = this.svgElement.querySelector(`#${partDef.id}`);
                    if (el) {
                        this.elementCache.set(resolved, el);
                        if (partDef.pivot) {
                            el.style.transformOrigin = `${partDef.pivot.x}px ${partDef.pivot.y}px`;
                        }
                    }
                }
            }

            return {
                key: resolved,
                definition: this.config.parts[resolved],
                element: el || null,
                state: this.getPartState(resolved)
            };
        }

        getPartState(partKey) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return null;
            const cur = this.states.get(resolved);
            return cur ? { ...cur } : { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
        }

        getAllPartStates() {
            const result = {};
            for (const [key, state] of this.states.entries()) {
                result[key] = { ...state };
            }
            return result;
        }

        setRotation(partKey, degrees) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const state = this.states.get(resolved) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            const partDef = this.config.parts[resolved];

            let rot = Number(degrees) || 0;
            if (partDef?.limits) {
                if (partDef.limits.minRot !== undefined) rot = Math.max(partDef.limits.minRot, rot);
                if (partDef.limits.maxRot !== undefined) rot = Math.min(partDef.limits.maxRot, rot);
            }

            state.rotation = rot;
            this.states.set(resolved, state);
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        setPosition(partKey, x, y) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const state = this.states.get(resolved) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            const partDef = this.config.parts[resolved];

            let posX = Number(x) || 0;
            let posY = Number(y) || 0;
            if (partDef?.limits) {
                if (partDef.limits.minX !== undefined) posX = Math.max(partDef.limits.minX, posX);
                if (partDef.limits.maxX !== undefined) posX = Math.min(partDef.limits.maxX, posX);
                if (partDef.limits.minY !== undefined) posY = Math.max(partDef.limits.minY, posY);
                if (partDef.limits.maxY !== undefined) posY = Math.min(partDef.limits.maxY, posY);
            }

            state.x = posX;
            state.y = posY;
            this.states.set(resolved, state);
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        setScale(partKey, scaleX, scaleY = null) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const state = this.states.get(resolved) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            state.scaleX = Number(scaleX) || 1;
            state.scaleY = scaleY !== null ? (Number(scaleY) || 1) : state.scaleX;

            this.states.set(resolved, state);
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        setOpacity(partKey, opacity) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const state = this.states.get(resolved) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            state.opacity = Math.max(0, Math.min(1, Number(opacity) ?? 1));

            this.states.set(resolved, state);
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        setTransform(partKey, transformObj = {}) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const state = this.states.get(resolved) || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
            const partDef = this.config.parts[resolved];

            if (transformObj.rotation !== undefined) {
                let rot = Number(transformObj.rotation) || 0;
                if (partDef?.limits) {
                    if (partDef.limits.minRot !== undefined) rot = Math.max(partDef.limits.minRot, rot);
                    if (partDef.limits.maxRot !== undefined) rot = Math.min(partDef.limits.maxRot, rot);
                }
                state.rotation = rot;
            }

            if (transformObj.x !== undefined) {
                let posX = Number(transformObj.x) || 0;
                if (partDef?.limits?.minX !== undefined) posX = Math.max(partDef.limits.minX, posX);
                if (partDef?.limits?.maxX !== undefined) posX = Math.min(partDef.limits.maxX, posX);
                state.x = posX;
            }

            if (transformObj.y !== undefined) {
                let posY = Number(transformObj.y) || 0;
                if (partDef?.limits?.minY !== undefined) posY = Math.max(partDef.limits.minY, posY);
                if (partDef?.limits?.maxY !== undefined) posY = Math.min(partDef.limits.maxY, posY);
                state.y = posY;
            }

            if (transformObj.scaleX !== undefined) {
                state.scaleX = Number(transformObj.scaleX) || 1;
            }
            if (transformObj.scaleY !== undefined) {
                state.scaleY = Number(transformObj.scaleY) || 1;
            }

            if (transformObj.opacity !== undefined) {
                state.opacity = Math.max(0, Math.min(1, Number(transformObj.opacity) ?? 1));
            }

            this.states.set(resolved, state);
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        resetPart(partKey) {
            const resolved = this.resolvePartKey(partKey);
            if (!resolved) return false;

            const partDef = this.config.parts[resolved];
            const defState = partDef?.defaultState || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };

            this.states.set(resolved, { ...defState });
            this.applyTransform(resolved);
            this.notify();
            return true;
        }

        resetAll() {
            for (const [key, partDef] of Object.entries(this.config.parts)) {
                const defState = partDef?.defaultState || { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 };
                this.states.set(key, { ...defState });
                this.applyTransform(key);
            }
            this.notify();
            console.log('[BuddyRigController] All body parts reset to original neutral pose.');
            return true;
        }

        applyTransform(partKey) {
            const part = this.getPart(partKey);
            if (!part || !part.element) return;

            const state = part.state;
            const partDef = part.definition;
            const el = part.element;

            // Configure transform-origin on the element
            if (partDef && partDef.pivot) {
                el.style.transformOrigin = `${partDef.pivot.x}px ${partDef.pivot.y}px`;
            }

            // Build CSS transform string
            const transforms = [];
            if (state.x !== 0 || state.y !== 0) {
                transforms.push(`translate(${state.x}px, ${state.y}px)`);
            }
            if (state.rotation !== 0) {
                transforms.push(`rotate(${state.rotation}deg)`);
            }
            if (state.scaleX !== 1 || state.scaleY !== 1) {
                transforms.push(`scale(${state.scaleX}, ${state.scaleY})`);
            }

            el.style.transform = transforms.length > 0 ? transforms.join(' ') : '';

            // Build SVG attribute transform string for maximum SVG engine compatibility
            if (typeof el.setAttribute === 'function') {
                const svgAttrTransforms = [];
                if (state.x !== 0 || state.y !== 0) {
                    svgAttrTransforms.push(`translate(${state.x}, ${state.y})`);
                }
                if (state.rotation !== 0 || state.scaleX !== 1 || state.scaleY !== 1) {
                    if (partDef?.pivot) {
                        svgAttrTransforms.push(`translate(${partDef.pivot.x}, ${partDef.pivot.y})`);
                    }
                    if (state.rotation !== 0) {
                        svgAttrTransforms.push(`rotate(${state.rotation})`);
                    }
                    if (state.scaleX !== 1 || state.scaleY !== 1) {
                        svgAttrTransforms.push(`scale(${state.scaleX}, ${state.scaleY})`);
                    }
                    if (partDef?.pivot) {
                        svgAttrTransforms.push(`translate(-${partDef.pivot.x}, -${partDef.pivot.y})`);
                    }
                }

                if (svgAttrTransforms.length > 0) {
                    el.setAttribute('transform', svgAttrTransforms.join(' '));
                } else if (typeof el.removeAttribute === 'function') {
                    el.removeAttribute('transform');
                }
            }

            if (state.opacity !== undefined && state.opacity !== 1) {
                el.style.opacity = state.opacity;
            } else {
                el.style.opacity = '';
            }
        }

        applyAllTransforms() {
            for (const key of Object.keys(this.config.parts)) {
                this.applyTransform(key);
            }
        }

        onChange(callback) {
            this.listeners.add(callback);
            callback(this.getAllPartStates());
            return () => this.listeners.delete(callback);
        }

        notify() {
            if (this.listeners.size === 0) return;
            const snapshot = this.getAllPartStates();
            for (const listener of this.listeners) {
                try {
                    listener(snapshot);
                } catch (e) {
                    console.error('[BuddyRigController] Error in state listener:', e);
                }
            }
        }

        destroy() {
            this.resetAll();
            this.listeners.clear();
            this.elementCache.clear();
            this.svgElement = null;
        }
    }

    global.BuddyRigController = BuddyRigController;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyRigController;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
