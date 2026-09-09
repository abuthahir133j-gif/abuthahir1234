/**
 * Travel AI Buddy — 3D Orbit Controls
 * 
 * Provides high-fidelity 3D Orbit Controls for the AI Companion (both Robot 1 and Robot 2).
 * 
 * Features:
 * - 3D Spherical Orbiting (Pitch / Yaw / Roll / Depth) with realistic CSS 3D perspective
 * - Smooth Inertia & Damping (exact Three.js OrbitControls physics feel)
 * - Mouse Wheel / Touch Pinch Zooming (camera distance / translateZ)
 * - Hover / Cursor Parallax Tracking (robot subtly leans towards mouse when idle)
 * - Default 3D Orbit Angle matching the reference floating tilt
 * - Smart Click vs. Drag Discrimination (retains click-to-wave and dialogue)
 * - Double-click smoothly resets to default 3D pose
 */
(function (global) {
    class BuddyOrbitControls {
        constructor(scene, options = {}) {
            this.scene = scene;
            this.container = scene?.characterElement || null;
            this.rootElement = scene?.rootElement || null;

            // Configuration Options
            this.options = {
                enabled: options.enabled !== undefined ? options.enabled : true,
                enableDamping: options.enableDamping !== undefined ? options.enableDamping : true,
                dampingFactor: options.dampingFactor || 0.08,
                rotateSpeed: options.rotateSpeed || 0.45,
                zoomSpeed: options.zoomSpeed || 0.12,
                minPitch: options.minPitch || -35, // degrees
                maxPitch: options.maxPitch || 35,
                minDistance: options.minDistance || 0.7, // zoom scale
                maxDistance: options.maxDistance || 1.6,
                // Default Resting Pose matching reference (tilted 3D floating perspective)
                defaultYaw: options.defaultYaw !== undefined ? options.defaultYaw : 12,
                defaultPitch: options.defaultPitch !== undefined ? options.defaultPitch : -6,
                defaultScale: options.defaultScale || 1.0,
                autoRotate: options.autoRotate || false,
                autoRotateSpeed: options.autoRotateSpeed || 0.5,
                hoverTracking: options.hoverTracking !== undefined ? options.hoverTracking : true
            };

            // Current State
            this.yaw = this.options.defaultYaw;
            this.pitch = this.options.defaultPitch;
            this.scale = this.options.defaultScale;

            // Target State (for damping interpolation)
            this.targetYaw = this.yaw;
            this.targetPitch = this.pitch;
            this.targetScale = this.scale;

            // Velocity (for momentum release)
            this.velocityYaw = 0;
            this.velocityPitch = 0;

            // Hover Parallax Offset
            this.hoverYaw = 0;
            this.hoverPitch = 0;

            // Interaction State
            this.isDragging = false;
            this.startX = 0;
            this.startY = 0;
            this.lastX = 0;
            this.lastY = 0;
            this.dragDistance = 0;
            this.hasMoved = false;

            this._rafId = null;
            this._boundOnPointerDown = this._onPointerDown.bind(this);
            this._boundOnPointerMove = this._onPointerMove.bind(this);
            this._boundOnPointerUp = this._onPointerUp.bind(this);
            this._boundOnWheel = this._onWheel.bind(this);
            this._boundOnDblClick = this._onDblClick.bind(this);
            this._boundOnGlobalMouseMove = this._onGlobalMouseMove.bind(this);

            if (this.container) {
                this.attach(this.container, this.rootElement);
            }
        }

        attach(containerElement, rootElement = null) {
            this.detach();
            this.container = containerElement;
            this.rootElement = rootElement || containerElement.parentElement;

            if (!this.container) return;

            // Configure 3D perspective styles
            if (this.rootElement) {
                this.rootElement.style.perspective = '1000px';
                this.rootElement.style.perspectiveOrigin = '50% 50%';
            }
            this.container.style.transformStyle = 'preserve-3d';
            this.container.style.cursor = 'grab';
            this.container.classList.add('orbit-controlled');

            // Attach interaction events
            this.container.addEventListener('pointerdown', this._boundOnPointerDown, { passive: false });
            this.container.addEventListener('wheel', this._boundOnWheel, { passive: false });
            this.container.addEventListener('dblclick', this._boundOnDblClick);

            if (typeof window !== 'undefined') {
                window.addEventListener('pointermove', this._boundOnPointerMove, { passive: false });
                window.addEventListener('pointerup', this._boundOnPointerUp);
                window.addEventListener('pointercancel', this._boundOnPointerUp);
                window.addEventListener('mousemove', this._boundOnGlobalMouseMove, { passive: true });
            }

            // Start animation & physics loop
            this._startLoop();
            this._applyTransform();
        }

        detach() {
            this._stopLoop();
            if (this.container) {
                this.container.removeEventListener('pointerdown', this._boundOnPointerDown);
                this.container.removeEventListener('wheel', this._boundOnWheel);
                this.container.removeEventListener('dblclick', this._boundOnDblClick);
                this.container.classList.remove('orbit-controlled');
            }
            if (typeof window !== 'undefined') {
                window.removeEventListener('pointermove', this._boundOnPointerMove);
                window.removeEventListener('pointerup', this._boundOnPointerUp);
                window.removeEventListener('pointercancel', this._boundOnPointerUp);
                window.removeEventListener('mousemove', this._boundOnGlobalMouseMove);
            }
        }

        _onPointerDown(e) {
            if (!this.options.enabled) return;
            // Only primary mouse button or single touch
            if (e.button !== undefined && e.button !== 0) return;

            this.isDragging = true;
            this.hasMoved = false;
            this.dragDistance = 0;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.velocityYaw = 0;
            this.velocityPitch = 0;

            if (this.container) {
                this.container.style.cursor = 'grabbing';
            }

            if (e.cancelable && typeof e.preventDefault === 'function' && e.pointerType !== 'mouse') {
                e.preventDefault();
            }
        }

        _onPointerMove(e) {
            if (!this.isDragging || !this.options.enabled) return;

            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;

            const totalDist = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
            this.dragDistance = totalDist;
            if (totalDist > 5) {
                this.hasMoved = true;
            }

            // Calculate spherical orbit rotation
            const deltaYaw = dx * this.options.rotateSpeed;
            const deltaPitch = -dy * this.options.rotateSpeed;

            this.targetYaw += deltaYaw;
            this.targetPitch = Math.max(this.options.minPitch, Math.min(this.options.maxPitch, this.targetPitch + deltaPitch));

            this.velocityYaw = deltaYaw;
            this.velocityPitch = deltaPitch;

            if (e.cancelable && typeof e.preventDefault === 'function' && this.hasMoved) {
                e.preventDefault();
            }
        }

        _onPointerUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;

            if (this.container) {
                this.container.style.cursor = 'grab';
            }

            // If dragged significantly, suppress click action so it doesn't trigger wave speech
            if (this.hasMoved) {
                const suppressClick = (evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                };
                this.container?.addEventListener('click', suppressClick, { capture: true, once: true });
                setTimeout(() => {
                    this.container?.removeEventListener('click', suppressClick, { capture: true });
                }, 50);
            }
        }

        _onWheel(e) {
            if (!this.options.enabled) return;
            e.preventDefault();

            const zoomDelta = e.deltaY > 0 ? -this.options.zoomSpeed : this.options.zoomSpeed;
            this.targetScale = Math.max(
                this.options.minDistance,
                Math.min(this.options.maxDistance, this.targetScale + zoomDelta)
            );
        }

        _onDblClick(e) {
            e.preventDefault();
            this.reset();
        }

        _onGlobalMouseMove(e) {
            if (!this.options.hoverTracking || this.isDragging || !this.container) return;

            const rect = this.container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const diffX = (e.clientX - centerX) / (typeof window !== 'undefined' ? window.innerWidth : 800);
            const diffY = (e.clientY - centerY) / (typeof window !== 'undefined' ? window.innerHeight : 600);

            // Subtle leaning tilt towards cursor (±8 deg)
            this.hoverYaw = Math.max(-8, Math.min(8, diffX * 16));
            this.hoverPitch = Math.max(-6, Math.min(6, -diffY * 12));
        }

        _startLoop() {
            if (this._rafId) return;

            const raf = typeof requestAnimationFrame !== 'undefined'
                ? requestAnimationFrame
                : (fn) => setTimeout(fn, 16);

            const loop = () => {
                this._update();
                this._rafId = raf(loop);
            };
            this._rafId = raf(loop);
        }

        _stopLoop() {
            if (this._rafId) {
                if (typeof cancelAnimationFrame !== 'undefined') {
                    cancelAnimationFrame(this._rafId);
                } else {
                    clearTimeout(this._rafId);
                }
                this._rafId = null;
            }
        }

        _update() {
            // Apply auto-rotation if active
            if (this.options.autoRotate && !this.isDragging) {
                this.targetYaw += this.options.autoRotateSpeed;
            }

            // Apply inertia decay after dragging release
            if (!this.isDragging && (Math.abs(this.velocityYaw) > 0.01 || Math.abs(this.velocityPitch) > 0.01)) {
                this.targetYaw += this.velocityYaw;
                this.targetPitch = Math.max(
                    this.options.minPitch,
                    Math.min(this.options.maxPitch, this.targetPitch + this.velocityPitch)
                );
                this.velocityYaw *= 0.92;
                this.velocityPitch *= 0.92;
            }

            // Smooth damping interpolation (exact OrbitControls feel)
            if (this.options.enableDamping) {
                const f = this.options.dampingFactor;
                this.yaw += (this.targetYaw - this.yaw) * f;
                this.pitch += (this.targetPitch - this.pitch) * f;
                this.scale += (this.targetScale - this.scale) * f;
            } else {
                this.yaw = this.targetYaw;
                this.pitch = this.targetPitch;
                this.scale = this.targetScale;
            }

            this._applyTransform();
        }

        _applyTransform() {
            if (!this.container) return;

            // Combine base orbit angles with subtle hover parallax
            const effectiveYaw = (this.yaw + this.hoverYaw).toFixed(2);
            const effectivePitch = (this.pitch + this.hoverPitch).toFixed(2);
            const effectiveScale = this.scale.toFixed(3);

            // Dynamic depth elevation for floating perspective
            const zTranslate = Math.round((this.scale - 1) * 60);

            this.container.style.transform = `perspective(1000px) translateZ(${zTranslate}px) rotateX(${effectivePitch}deg) rotateY(${effectiveYaw}deg) scale(${effectiveScale})`;
        }

        /**
         * Smoothly reset orbit angles back to the default tilted floating pose
         */
        reset(duration = 400) {
            this.targetYaw = this.options.defaultYaw;
            this.targetPitch = this.options.defaultPitch;
            this.targetScale = this.options.defaultScale;
            this.velocityYaw = 0;
            this.velocityPitch = 0;
            this.hoverYaw = 0;
            this.hoverPitch = 0;
        }

        /**
         * Set custom orbit angles directly
         */
        setAngles(yaw, pitch, scale = null) {
            this.targetYaw = Number(yaw);
            this.targetPitch = Math.max(this.options.minPitch, Math.min(this.options.maxPitch, Number(pitch)));
            if (scale !== null) {
                this.targetScale = Math.max(this.options.minDistance, Math.min(this.options.maxDistance, Number(scale)));
            }
        }

        getAngles() {
            return {
                yaw: this.yaw,
                pitch: this.pitch,
                scale: this.scale
            };
        }
    }

    global.BuddyOrbitControls = BuddyOrbitControls;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BuddyOrbitControls;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
