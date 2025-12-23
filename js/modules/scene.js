
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.159/examples/jsm/webxr/ARButton.js';

export class SceneManager {
    constructor(onRenderCallback, onSessionStart, onSessionEnd) {
        this.onRender = onRenderCallback;
        this.onSessionStart = onSessionStart;
        this.onSessionEnd = onSessionEnd;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controller = null;
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3));

        const arButton = ARButton.createButton(this.renderer, {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        arButton.classList.add('custom-ar-button');
        document.body.appendChild(arButton);

        this.renderer.xr.addEventListener('sessionstart', () => this.onSessionStart());
        this.renderer.xr.addEventListener('sessionend', () => this.onSessionEnd());

        this.renderer.setAnimationLoop((t, frame) => {
            this.onRender(t, frame);
            this.renderer.render(this.scene, this.camera);
        });

        this.controller = this.renderer.xr.getController(0);
        this.scene.add(this.controller);
    }

    // Helper to get session
    getSession() {
        return this.renderer.xr.getSession();
    }
}
