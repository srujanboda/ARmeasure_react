
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';

export class InteractionManager {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.reticle = null;
        this.hitTestSource = null;
        this.isWallMode = false;

        this.initReticle();
    }

    initReticle() {
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x00ff88 })
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    update(frame, session) {
        if (!this.hitTestSource && session) {
            session.requestReferenceSpace('viewer').then(rs => {
                session.requestHitTestSource({ space: rs }).then(s => this.hitTestSource = s);
            });
        }

        if (this.hitTestSource && frame) {
            const hits = frame.getHitTestResults(this.hitTestSource);
            if (hits.length > 0) {
                this.isWallMode = false;
                this.reticle.visible = true;
                const pose = hits[0].getPose(this.renderer.xr.getReferenceSpace());
                this.reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                this.isWallMode = true;
                this.reticle.visible = true;
                // Wall Mode Fallback: 2m in front
                const viewDir = new THREE.Vector3();
                this.camera.getWorldDirection(viewDir);
                const targetPos = this.camera.position.clone().add(viewDir.multiplyScalar(2.0));

                this.reticle.position.copy(targetPos);
                this.reticle.rotation.set(0, 0, 0);
                this.reticle.lookAt(this.camera.position);
                this.reticle.rotateX(Math.PI / 2);
                this.reticle.updateMatrix();
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
