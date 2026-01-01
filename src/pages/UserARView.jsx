import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import { usePeer } from '../hooks/usePeer';
import PlanParser from '../components/PlanParser';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');
    const [arActive, setArActive] = useState(false);
    const { status, endCall, sendData, data: remoteData, isDataConnected, toggleCamera } = usePeer('user', code, arActive);
    const navigate = useNavigate();

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    const arRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });
    const [showPlanParser, setShowPlanParser] = useState(false);


    const uiRef = useRef(null);

    // Prevent WebXR taps when interacting with UI
    useEffect(() => {
        const preventXR = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const uiContainer = uiRef.current;
        if (uiContainer) {
            // "beforexrselect" is the standard event to stop XR interaction from DOM overlay
            uiContainer.addEventListener('beforexrselect', preventXR);
        }

        return () => {
            if (uiContainer) {
                uiContainer.removeEventListener('beforexrselect', preventXR);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <ARScene
                ref={arRef}
                onStatsUpdate={setStats}
                onSessionStart={() => setArActive(true)}
                onSessionEnd={() => {
                    setArActive(false);
                }}
                overlayRoot={uiRef.current}
            />

            {/* Main UI Container - Hooks generic beforexrselect prevention */}
            <div ref={uiRef} style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1000,
                width: '100vw',
                height: '100vh'
            }}>

                {/* Stats Bar (Top Center) */}
                <div className="glass-panel info-badge" style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '10px 28px',
                    borderRadius: 30,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'auto',
                    zIndex: 1001,
                    whiteSpace: 'nowrap',
                    minWidth: 'fit-content'
                }}>
                    <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1.5 }}>Total Distance</div>
                    <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
                        <span style={{ color: '#4cc9f0' }}>{stats.total.split(' ')[0]}</span>
                        <span style={{ fontSize: 16, marginLeft: 4 }}>{stats.total.split(' ')[1]}</span>
                    </div>
                </div>

                {/* End Call Button - Visible when AR is inactive */}
                {!arActive && (
                    <div style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        pointerEvents: 'auto',
                        zIndex: 1002
                    }}>
                        <button
                            className="glass-btn glass-btn-danger"
                            onClick={handleEndCall}
                            title="End Call"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                <line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Right Dock (Tools) */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    right: 20,
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    pointerEvents: 'auto',
                    zIndex: 1001
                }}>
                    {/* Unit Toggle */}
                    <button
                        className="glass-btn"
                        onClick={(e) => { e.stopPropagation(); arRef.current?.cycleUnit(); }}
                        style={{ width: 56, height: 56, borderRadius: '50%', fontSize: 10 }}
                    >
                        <span style={{ fontSize: 10, fontWeight: 'bold' }}>UNIT</span>
                    </button>

                    {/* Camera Switch */}
                    <button
                        className="glass-btn"
                        onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                        style={{ width: 56, height: 56, borderRadius: '50%' }}
                        title="Switch Camera"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 19c-4.97 0-9-4.03-9-9s4.03-9 9-9c3.84 0 7.15 2.41 8.44 5.8"></path>
                            <path d="M22 6l-3 4-3-4"></path>
                            <path d="M13 5c4.97 0 9 4.03 9 9s-4.03 9-9 9c-3.84 0-7.15-2.41-8.44-5.8"></path>
                            <path d="M2 18l3-4 3 4"></path>
                        </svg>
                    </button>

                    {/* Plan Parser */}
                    <button
                        className="glass-btn glass-btn-primary"
                        onClick={(e) => { e.stopPropagation(); setShowPlanParser(true); }}
                        style={{ width: 56, height: 56, borderRadius: '50%' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                </div>

                {/* Bottom Bar (Controls) - Only if active */}
                {stats.count > 0 && (
                    <div className="glass-panel" style={{
                        position: 'absolute',
                        bottom: 80,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '12px 16px',
                        borderRadius: 24,
                        display: 'flex',
                        gap: 12,
                        pointerEvents: 'auto',
                        zIndex: 1001,
                        width: 'auto',
                        maxWidth: '90%',
                        flexWrap: 'nowrap'
                    }}>
                        <button
                            className="glass-btn"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.undo(); }}
                            style={{ borderRadius: 16, padding: '0 16px', height: 44, fontSize: 14 }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
                            Undo
                        </button>

                        <button
                            className="glass-btn glass-btn-primary"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.startNewLine(); }}
                            style={{ borderRadius: 16, padding: '0 16px', height: 44, fontSize: 14 }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            New Line
                        </button>

                        <button
                            className="glass-btn glass-btn-danger"
                            onClick={(e) => { e.stopPropagation(); arRef.current?.reset(); }}
                            style={{ borderRadius: 16, padding: '0 16px', height: 44, fontSize: 14 }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Plan Parser Modal */}
            {showPlanParser && (
                <div className="glass-panel" style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    background: 'rgba(20,20,20,0.95)',
                    backdropFilter: 'blur(20px)',
                    overflowY: 'auto',
                    padding: 20
                }}>
                    <button
                        className="glass-btn"
                        onClick={() => setShowPlanParser(false)}
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            width: 40, height: 40, borderRadius: '50%',
                            border: 'none', background: 'rgba(255,255,255,0.1)'
                        }}
                    >
                        ✕
                    </button>
                    <h2 style={{ color: 'white', textAlign: 'center', marginBottom: 30, fontFamily: 'Outfit' }}>Plan Parser</h2>

                    {/* Pass a prop or wrap PlanParser to style it internally? 
                        For now, just render it. The inner "PlanParser" implementation is raw HTML style 
                        so it might look a bit plain inside this premium modal, but acceptable for now. 
                    */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 20, maxWidth: 800, margin: '0 auto' }}>
                        <PlanParser role="user" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserARView;
