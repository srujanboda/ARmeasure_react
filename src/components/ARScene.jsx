import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { SceneManager } from '../modules/scene';
import { MeasureManager } from '../modules/measure';
import { InteractionManager } from '../modules/interactions';
import { formatDistance } from '../modules/utils';

const ARScene = forwardRef((props, ref) => {
    const containerRef = useRef(null);
    const logicRef = useRef({
        sceneManager: null,
        measureManager: null,
        interactionManager: null,
        currentUnit: 'm',
        xrWebGLBinding: null,
        cameraTexture: null,
        spectatorCanvas: null,
        spectatorRenderer: null,
        backgroundScene: null,
        backgroundCamera: null,
        backgroundMesh: null
    });

    const [statusText, setStatusText] = useState("Initializing AR...");
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });

    useImperativeHandle(ref, () => ({
        undo: () => {
            logicRef.current.measureManager?.undoLastPoint();
            updateUI();
        },
        reset: () => {
            logicRef.current.measureManager?.resetAll();
            updateUI();
        },
        startNewLine: () => {
            logicRef.current.measureManager?.startNewLine();
            updateUI();
        },
        setUnit: (u) => {
            logicRef.current.currentUnit = u;
            logicRef.current.measureManager?.setUnit(u);
            updateUI();
        },
        cycleUnit: () => {
            const units = ['m', 'cm', 'in', 'ft'];
            const current = logicRef.current.currentUnit;
            const next = units[(units.indexOf(current) + 1) % units.length];
            logicRef.current.currentUnit = next;
            logicRef.current.measureManager?.setUnit(next);
            updateUI();
        }
    }));

    useEffect(() => {
        initAR();
        return () => {
            // Cleanup
            if (logicRef.current.sceneManager) {
                logicRef.current.sceneManager.dispose();
            }
        };
    }, []);

    const propsRef = useRef(props);
    useEffect(() => {
        propsRef.current = props;
    }, [props]);

    const initAR = () => {
        const mgr = logicRef.current;

        // 1. Scene
        mgr.sceneManager = new SceneManager(
            (t, frame) => render(t, frame),
            () => {
                setStatusText("AR Session Active");
                if (propsRef.current.onSessionStart) propsRef.current.onSessionStart();
            },
            () => {
                setStatusText("AR Session Ended");
                console.log("Triggering onSessionEnd callback...");
                if (propsRef.current.onSessionEnd) propsRef.current.onSessionEnd();
            }
        );
        mgr.sceneManager.init(props.overlayRoot);

        // Ensure background transparency for AR feed
        if (mgr.sceneManager.renderer) {
            mgr.sceneManager.renderer.setClearColor(0x000000, 0);
        }

        // 2. Managers
        mgr.measureManager = new MeasureManager(mgr.sceneManager.scene);
        mgr.interactionManager = new InteractionManager(
            mgr.sceneManager.scene,
            mgr.sceneManager.renderer,
            mgr.sceneManager.camera
        );

        // 3. Listeners
        mgr.sceneManager.controller.addEventListener('select', handleTap);
        document.body.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('input')) handleTap();
        });

        // --- SPECTATOR CANVAS SETUP ---
        if (!mgr.spectatorCanvas) {
            mgr.spectatorCanvas = document.createElement('canvas');
            mgr.spectatorCanvas.width = 640;
            mgr.spectatorCanvas.height = 480;
            mgr.spectatorCanvas.style.display = 'none';
            document.body.appendChild(mgr.spectatorCanvas);

            mgr.spectatorRenderer = new THREE.WebGLRenderer({
                canvas: mgr.spectatorCanvas,
                antialias: false
            });
            mgr.spectatorRenderer.setPixelRatio(1);
            mgr.spectatorRenderer.setSize(640, 480);
            mgr.spectatorRenderer.autoClear = false;

            // --- Background Shader Setup ---
            mgr.backgroundScene = new THREE.Scene();
            mgr.backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            const geometry = new THREE.PlaneGeometry(2, 2);
            mgr.backgroundMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x000000 }));
            mgr.backgroundScene.add(mgr.backgroundMesh);
        }

        // Notify parent about the spectator stream source
        if (propsRef.current.onSpectatorCanvasReady) {
            propsRef.current.onSpectatorCanvasReady(mgr.spectatorCanvas);
        }
    };

    const handleTap = () => {
        const mgr = logicRef.current;
        if (!mgr.interactionManager || !mgr.measureManager) return;

        const pos = mgr.interactionManager.getReticlePosition();
        if (pos && mgr.measureManager.getPointCount() < 20) {
            mgr.measureManager.addPoint(pos);
            updateUI();
        }
    };

    const render = (t, frame) => {
        const mgr = logicRef.current;
        if (!mgr.interactionManager || !mgr.measureManager) return;

        const session = mgr.sceneManager.getSession();
        mgr.interactionManager.update(frame, session);

        // Update dot animations (pulse)
        mgr.measureManager.updateAnimations(t);

        // Real-time Visuals & UI (Rubber Band)
        const pos = mgr.interactionManager.getReticlePosition();
        mgr.measureManager.updatePreview(pos);

        // Dynamic distance update in UI pill
        if (pos || mgr.measureManager.getPointCount() > 0) {
            updateUI(pos);
        }

        // --- SPECTATOR MODE RENDERING ---
        if (session && frame && window.XRWebGLBinding && mgr.spectatorRenderer) {
            try {
                if (!mgr.xrWebGLBinding) {
                    mgr.xrWebGLBinding = new XRWebGLBinding(session, mgr.sceneManager.renderer.getContext());
                }

                const viewerPose = frame.getViewerPose(mgr.sceneManager.renderer.xr.getReferenceSpace());
                if (viewerPose && viewerPose.views && viewerPose.views.length > 0) {
                    const view = viewerPose.views[0];
                    if (view.camera) {
                        const webglTexture = mgr.xrWebGLBinding.getCameraImage(view.camera);

                        // Inject raw WebGLTexture into Three.js
                        if (!mgr.cameraTexture) {
                            mgr.cameraTexture = new THREE.Texture();
                        }
                        const props = mgr.spectatorRenderer.properties.get(mgr.cameraTexture);
                        props.__webglTexture = webglTexture;
                        mgr.cameraTexture.needsUpdate = true;

                        // Update background material
                        mgr.backgroundMesh.material.map = mgr.cameraTexture;
                        mgr.backgroundMesh.material.needsUpdate = true;

                        // 1. Clear spectator renderer
                        mgr.spectatorRenderer.clear();

                        // 2. Render background (camera feed)
                        mgr.spectatorRenderer.render(mgr.backgroundScene, mgr.backgroundCamera);

                        // 3. Render 3D overlays (measurements) on top
                        const originalBg = mgr.sceneManager.scene.background;
                        mgr.sceneManager.scene.background = null;
                        mgr.spectatorRenderer.render(mgr.sceneManager.scene, mgr.sceneManager.camera);
                        mgr.sceneManager.scene.background = originalBg;
                    }
                }
            } catch (err) {
                console.error("Spectator Render Error:", err);
            }
        }
    };

    const updateUI = (livePos) => {
        const mgr = logicRef.current;
        const dist = mgr.measureManager.getTotalDistance(livePos);
        const text = formatDistance(dist, mgr.currentUnit);
        const count = mgr.measureManager.getPointCount();

        // Area calculation
        const areaVal = mgr.measureManager.getArea();
        const areaText = areaVal > 0 ? `${areaVal.toFixed(2)} m²` : null;

        // Segments breakdown
        const segments = mgr.measureManager.getSegments(livePos).map(s => ({
            ...s,
            distanceText: formatDistance(s.distance, mgr.currentUnit)
        }));

        setStats({ total: text, count, area: areaText, segments });
    };

    useEffect(() => {
        if (props.onStatusUpdate) props.onStatusUpdate(statusText);
    }, [statusText, props.onStatusUpdate]);

    useEffect(() => {
        if (props.onStatsUpdate) props.onStatsUpdate(stats);
    }, [stats, props.onStatsUpdate]);

    return (
        <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
        </div>
    );
});

export default ARScene;
