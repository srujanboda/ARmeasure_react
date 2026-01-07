
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

export class SceneManager {
    constructor(onRenderCallback, onSessionStart, onSessionEnd) {
        this.onRender = onRenderCallback;
        this.onSessionStart = onSessionStart;
        this.onSessionEnd = onSessionEnd;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controller = null;

        // Streaming canvas for WebRTC
        this.streamCanvas = null;
        this.streamCtx = null;
        this.isStreaming = false;
    }

    init(overlayRoot) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        // Enable preserveDrawingBuffer for canvas capture during XR
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '0';
        document.body.appendChild(this.renderer.domElement);

        // Create streaming canvas (hidden, used for WebRTC capture)
        this.streamCanvas = document.createElement('canvas');
        this.streamCanvas.width = 640;
        this.streamCanvas.height = 480;
        this.streamCanvas.style.display = 'none';
        document.body.appendChild(this.streamCanvas);
        this.streamCtx = this.streamCanvas.getContext('2d');

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3));

        const arButton = ARButton.createButton(this.renderer, {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: overlayRoot || document.body }
        });
        arButton.classList.add('custom-ar-button');
        document.body.appendChild(arButton);

        this.renderer.xr.addEventListener('sessionstart', () => this.onSessionStart());
        this.renderer.xr.addEventListener('sessionend', () => this.onSessionEnd());

        this.renderer.setAnimationLoop((t, frame) => {
            this.onRender(t, frame);
            this.renderer.render(this.scene, this.camera);

            // Copy to streaming canvas if streaming is active
            if (this.isStreaming && this.streamCtx && this.renderer.domElement) {
                try {
                    this.streamCtx.drawImage(
                        this.renderer.domElement,
                        0, 0,
                        this.streamCanvas.width,
                        this.streamCanvas.height
                    );
                } catch (e) {
                    // Ignore errors during frame copy
                }
            }
        });

        this.controller = this.renderer.xr.getController(0);
        this.scene.add(this.controller);
    }

    // Helper to get session
    getSession() {
        return this.renderer.xr.getSession();
    }

    // Start streaming and get canvas stream for WebRTC
    getCanvasStream(frameRate = 15) {
        if (this.streamCanvas) {
            try {
                this.isStreaming = true;
                const stream = this.streamCanvas.captureStream(frameRate);
                console.log("Streaming canvas stream created:", stream);
                return stream;
            } catch (e) {
                console.error("Failed to capture stream canvas:", e);
                return null;
            }
        }
        return null;
    }

    // Stop streaming
    stopStreaming() {
        this.isStreaming = false;
    }

    dispose() {
        this.isStreaming = false;

        if (this.streamCanvas && this.streamCanvas.parentNode) {
            this.streamCanvas.parentNode.removeChild(this.streamCanvas);
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        const btn = document.querySelector('.custom-ar-button');
        if (btn) btn.remove();

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.streamCanvas = null;
        this.streamCtx = null;
    }
}
