
import * as THREE from 'three';
import { formatDistance } from './utils.js';

export class MeasureManager {
    constructor(scene) {
        this.scene = scene;
        this.points = [];
        this.pointMeshes = [];
        this.line = null;
        this.labels = [];
        this.allChains = [];
        this.previewLine = null;
    }

    addPoint(position) {
        // Prevent duplicate points (e.g. from double taps)
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            if (position.distanceTo(lastPoint) < 0.1) {
                // Too close to last point, ignore
                console.log("Point too close, ignoring");
                return;
            }
        }

        const p = position.clone();
        const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.012),
            new THREE.MeshBasicMaterial({ color: 0x007bff }) // Blue matching reticle
        );
        dot.position.copy(p);
        this.scene.add(dot);

        this.pointMeshes.push(dot);
        this.points.push(p);

        this.updateLine();
    }

    undoLastPoint() {
        // 1. If current line has points, remove the latest
        if (this.points.length > 0) {
            const mesh = this.pointMeshes.pop();
            this.scene.remove(mesh);
            this.points.pop();
            this.updateLine();
            return;
        }

        // 2. If current line is empty, try to "re-open" the last saved chain
        if (this.allChains.length > 0) {
            const lastChain = this.allChains.pop();
            this.points = lastChain.points;
            this.pointMeshes = lastChain.meshes;
            this.line = lastChain.line;
            this.labels = lastChain.labels;

            // Now that we've restored it, undo the last point of this restored line
            this.undoLastPoint();
        }
    }

    resetAll() {
        // Clear history chains
        this.allChains.forEach(c => {
            c.meshes.forEach(m => this.scene.remove(m));
            if (c.line) this.scene.remove(c.line);
            c.labels.forEach(l => this.scene.remove(l));
        });
        this.allChains = [];

        // Clear current points
        this.points.forEach((_, i) => this.scene.remove(this.pointMeshes[i]));
        this.points = [];
        this.pointMeshes = [];

        if (this.line) {
            this.scene.remove(this.line);
            this.line = null;
        }

        this.labels.forEach(l => this.scene.remove(l));
        this.labels = [];
    }

    startNewLine() {
        if (this.points.length < 2) return;
        this.allChains.push({
            points: [...this.points],
            meshes: [...this.pointMeshes],
            line: this.line,
            labels: [...this.labels]
        });
        this.points = [];
        this.pointMeshes = [];
        this.line = null; // Don't remove from scene, just detach from current ref
        this.labels = [];

        // Note: The previous objects remain in the scene until resetAll is called
    }

    updateLine() {
        // Clean up current transient line and labels
        if (this.line) this.scene.remove(this.line);
        this.labels.forEach(l => this.scene.remove(l));
        this.labels = [];

        if (this.points.length < 2) {
            // Nothing to draw
            return;
        }

        this.line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(this.points),
            new THREE.LineBasicMaterial({ color: 0xff0044, linewidth: 6 })
        );
        this.scene.add(this.line);

        // Add labels
        for (let i = 1; i < this.points.length; i++) {
            const d = this.points[i - 1].distanceTo(this.points[i]);
            const mid = new THREE.Vector3().lerpVectors(this.points[i - 1], this.points[i], 0.5);
            const label = this.createLabel(d);
            label.position.copy(mid);
            label.scale.set(0.25, 0.1, 1);
            this.scene.add(label);
            this.labels.push(label);
        }
    }

    updatePreview(reticlePos) {
        // Remove existing preview
        if (this.previewLine) {
            this.scene.remove(this.previewLine);
            this.previewLine = null;
        }

        // Only draw if there's at least one point and reticle is visible
        if (this.points.length === 0 || !reticlePos) return;

        const lastPoint = this.points[this.points.length - 1];
        const geometry = new THREE.BufferGeometry().setFromPoints([lastPoint, reticlePos]);
        const material = new THREE.LineBasicMaterial({
            color: 0x007bff,
            transparent: true,
            opacity: 0.5,
            linewidth: 2
        });

        this.previewLine = new THREE.Line(geometry, material);
        this.scene.add(this.previewLine);
    }

    createLabel(distMeters) {
        // We always store and calculate in meters in logic, but UI might want to show cached unit or we just pass meters
        // Ideally the label should react to unit changes, but for now we bake it based on a "currentUnit" passed in?
        // Or simpler: We create a label that *always* updates? Three.js sprites don't update automatically.
        // Let's stick to the app.js logic: it redraws everything on update.
        // So we need access to the "current unit". We can pass it to updateLine or store it.
        // Let's assume meter for now and fix unit logic in main controller or pass it in.
        // Refactor: make getDistanceText(m) a callback or passed var.

        // For now, let's just make the texture. We will need the current unit.
        // I'll make format function a dependency.
        return this.createLabelSprite(distMeters);
    }

    // Dependencies need to be injected or passed.
    // I'll add `currentUnit` setter.
    setUnit(unit) {
        this.currentUnit = unit;

        // 1. Update current line labels
        this.updateLine();

        // 2. Update all saved chains
        this.allChains.forEach(chain => {
            // Remove old labels
            chain.labels.forEach(l => this.scene.remove(l));
            chain.labels = [];

            // Add new labels
            for (let i = 1; i < chain.points.length; i++) {
                const d = chain.points[i - 1].distanceTo(chain.points[i]);
                const mid = new THREE.Vector3().lerpVectors(chain.points[i - 1], chain.points[i], 0.5);
                const label = this.createLabel(d);
                label.position.copy(mid);
                label.scale.set(0.25, 0.1, 1);
                this.scene.add(label);
                chain.labels.push(label);
            }
        });
    }

    createLabelSprite(dist) {
        const cnv = document.createElement('canvas');
        const c = cnv.getContext('2d');
        cnv.width = 200; cnv.height = 70;
        c.fillStyle = 'rgba(0,0,0,0.9)'; c.fillRect(0, 0, 200, 70);
        c.fillStyle = '#fff'; c.font = 'bold 42px system-ui';
        c.textAlign = 'center'; c.textBaseline = 'middle';

        const text = formatDistance(dist, this.currentUnit || 'm'); // Default to m
        c.fillText(text, 100, 35);

        return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), depthTest: false }));
    }

    getTotalDistance(liveReticlePos) {
        let total = 0;
        // 1. Sum distances from all archived chains
        this.allChains.forEach(chain => {
            for (let i = 1; i < chain.points.length; i++) {
                total += chain.points[i - 1].distanceTo(chain.points[i]);
            }
        });

        // 2. Sum distances from current active line
        for (let i = 1; i < this.points.length; i++) {
            total += this.points[i - 1].distanceTo(this.points[i]);
        }

        // 3. Add live preview distance
        if (liveReticlePos && this.points.length > 0) {
            total += this.points[this.points.length - 1].distanceTo(liveReticlePos);
        }
        return total;
    }

    getPointCount() {
        let total = this.points.length;
        this.allChains.forEach(chain => {
            total += chain.points.length;
        });
        return total;
    }

    hasContent() {
        return this.points.length > 0 || this.allChains.length > 0;
    }
}
