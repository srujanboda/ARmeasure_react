
import * as THREE from 'three';

export class InteractionManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.reticle = null;
        this.hitTestSource = null;
        this.isRequestingHitTest = false;

        this.initReticle();
    }

    initReticle() {
        // Professional blue ring with white precision dot
        const group = new THREE.Group();

        // Blue outer ring
        const ringGeom = new THREE.RingGeometry(0.08, 0.10, 32);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x007bff, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        group.add(ring);

        // White precision center dot
        const dotGeom = new THREE.CircleGeometry(0.006, 16);
        dotGeom.rotateX(-Math.PI / 2);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        group.add(dot);

        this.reticle = group;
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    update(frame, session) {
        if (!session) return;

        // 1. Initialize hit test source using 'viewer' space
        if (!this.hitTestSource && !this.isRequestingHitTest) {
            this.isRequestingHitTest = true;

            // Wait a few frames for session to stabilize if needed
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    this.hitTestSource = source;
                    this.isRequestingHitTest = false;
                    console.log("Hit test source created with 'viewer' space");
                }).catch(err => {
                    console.error("Hit test source request failed:", err);
                    this.isRequestingHitTest = false;
                });
            }).catch(err => {
                console.error("Viewer reference space request failed:", err);
                this.isRequestingHitTest = false;
            });
        }

        // 2. Process hit test results
        if (this.hitTestSource && frame) {
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            if (!referenceSpace) return;

            const hitTestResults = frame.getHitTestResults(this.hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                if (pose) {
                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray(pose.transform.matrix);
                    this.reticle.updateMatrixWorld(true);
                } else {
                    this.reticle.visible = false;
                }
            } else {
                this.reticle.visible = false;
            }
        }
    }

    getReticlePosition() {
        if (this.reticle.visible) {
            return new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
        }
        return null;
    }
}
