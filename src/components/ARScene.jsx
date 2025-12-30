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
        currentUnit: 'm'
    });

    const [statusText, setStatusText] = useState("Initializing AR...");
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });

    useImperativeHandle(ref, () => ({
        undo: () => logicRef.current.measureManager?.undoLastPoint(),
        reset: () => logicRef.current.measureManager?.resetAll(),
        startNewLine: () => logicRef.current.measureManager?.startNewLine(),
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

    const initAR = () => {
        const mgr = logicRef.current;

        // 1. Scene
        mgr.sceneManager = new SceneManager(
            (t, frame) => render(t, frame),
            () => setStatusText("AR Session Active"),
            () => setStatusText("AR Session Ended")
        );
        mgr.sceneManager.init();

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
        if (!mgr.interactionManager) return;

        const session = mgr.sceneManager.getSession();
        mgr.interactionManager.update(frame, session);

        // UI Update Loop? prefer event driven but fallback to frame-based if needed
        // Here we just let React handle UI state updates when "Tap" happens or "Undo" happens
        // But formatting reticle status might be needed?
        // Let's keep it simple.
    };

    const updateUI = () => {
        const mgr = logicRef.current;
        const dist = mgr.measureManager.getTotalDistance();
        // formatDistance needs to be imported or copied
        const text = formatDistance(dist, mgr.currentUnit);
        const count = mgr.measureManager.getPointCount();
        setStats({ total: text, count });
    };

    return (
        <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
            {/* Styling mostly handled by WebXR overlay, but we render nothing here basically as Three.js appends canvas to body usually or we should target ref */}
            {/* SceneManager in original code appended to body. Let's fix SceneManager later to append to container if possible, but body is fine for AR. */}

            {/* We emit the UI state up or render usage instructions here? 
                Actually the parent handles UI overlay. We just emit stats via props? 
                or expose them? 
            */}
            {props.onStatsUpdate && props.onStatsUpdate(stats)}
        </div>
    );
});

export default ARScene;
