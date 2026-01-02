import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const arSceneRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });
    const [arStatus, setArStatus] = useState("Initializing AR...");
    const [showPlan, setShowPlan] = useState(false);

    // Pass AR active state to usePeer to optimize bandwidth during AR
    const { status: peerStatus, endCall, sendData, data: remoteData, isDataConnected, toggleCamera, facingMode } = usePeer('user', code, true);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
            {/* AR Scene in background */}
            <ARScene
                ref={arSceneRef}
                onStatusUpdate={setArStatus}
                onStatsUpdate={setStats}
            />

            {/* Overlay UI - Top Center Pill */}
            <div className="glass-panel" style={{
                position: 'absolute',
                top: 25,
                left: '50%',
                transform: 'translateX(-50%)',
                borderRadius: 40,
                padding: '10px 35px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minWidth: 160,
                pointerEvents: 'none',
                zIndex: 10
            }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', marginBottom: 2, textTransform: 'uppercase' }}>Total Distance</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#3399ff', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    {stats.total.split(' ')[0]} <span style={{ fontSize: 16, color: '#fff', opacity: 0.8 }}>{stats.total.split(' ')[1]}</span>
                </div>
            </div>

            {/* Top Left Info */}
            <div style={{ position: 'absolute', top: 20, left: 20, pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{arStatus}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{peerStatus}</div>
            </div>

            {/* Top Right Controls */}
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 12 }}>
                <button
                    onClick={handleEndCall}
                    className="glass-btn"
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(220,53,69,0.4)',
                        border: '1px solid rgba(220,53,69,0.3)'
                    }}
                    title="End Call"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                        <line x1="12" y1="2" x2="12" y2="12"></line>
                    </svg>
                </button>
            </div>

            {/* Middle Right Stack */}
            <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 10 }}>
                <button
                    onClick={() => arSceneRef.current?.cycleUnit()}
                    className="glass-btn"
                    style={{ width: 60, height: 60, borderRadius: '50%', fontSize: 13, fontWeight: 700 }}
                >
                    UNIT
                </button>
                <button
                    onClick={() => setShowPlan(!showPlan)}
                    className="glass-btn"
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: showPlan ? '#007bff' : 'rgba(255,255,255,0.15)',
                        borderColor: showPlan ? '#007bff' : 'rgba(255,255,255,0.2)'
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                </button>
                <button
                    onClick={toggleCamera}
                    className="glass-btn"
                    style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto', opacity: 0.8 }}
                >
                    {facingMode === 'user' ? '🔄' : '📷'}
                </button>
            </div>

            {/* Floating Plan View */}
            {showPlan && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '92%',
                    height: '80%',
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    zIndex: 1000,
                    overflow: 'auto',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.95)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, color: '#222', fontSize: 20 }}>Project Plan</h3>
                        <button onClick={() => setShowPlan(false)} style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
                    </div>
                    <PlanParser role="user" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                </div>
            )}

            {/* Conditional Bottom Controls */}
            {stats.count > 0 && (
                <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16, zIndex: 10, padding: '0 20px' }}>
                    <button
                        onClick={() => arSceneRef.current?.undo()}
                        className="glass-btn"
                        style={{ padding: '12px 24px', borderRadius: 30, fontSize: 14, minWidth: 100 }}
                    >
                        Undo
                    </button>
                    <button
                        onClick={() => arSceneRef.current?.startNewLine()}
                        className="glass-btn glass-btn-primary"
                        style={{ padding: '12px 24px', borderRadius: 30, fontSize: 15, minWidth: 130, fontWeight: 700 }}
                    >
                        New Room
                    </button>
                    <button
                        onClick={() => arSceneRef.current?.reset()}
                        className="glass-btn glass-btn-danger"
                        style={{ padding: '12px 24px', borderRadius: 30, fontSize: 14, minWidth: 100 }}
                    >
                        Reset
                    </button>
                </div>
            )}

            {/* Point Counter - Subtle Bottom right */}
            {stats.count > 0 && (
                <div style={{ position: 'absolute', bottom: 20, right: 20, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}>
                    {stats.count} points measured
                </div>
            )}
        </div>
    );
};

export default UserARView;