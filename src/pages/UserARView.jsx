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
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* AR Scene in background */}
            <ARScene
                ref={arSceneRef}
                onStatusUpdate={setArStatus}
                onStatsUpdate={setStats}
            />

            {/* Overlay UI */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 20, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px 15px', borderRadius: 12, color: 'white' }}>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Status</div>
                        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{arStatus}</div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>Peer: {peerStatus}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={toggleCamera}
                            style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
                        >
                            {facingMode === 'user' ? '🔄' : '📷'}
                        </button>
                        <button
                            onClick={() => setShowPlan(!showPlan)}
                            style={{ width: 44, height: 44, borderRadius: '50%', background: showPlan ? '#007bff' : 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
                        >
                            🗺️
                        </button>
                        <button
                            onClick={handleEndCall}
                            style={{ width: 44, height: 44, borderRadius: '50%', background: '#dc3545', border: 'none', color: 'white' }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: 20, background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: 12, color: 'white', width: 'fit-content' }}>
                    <div style={{ fontSize: 32, fontWeight: 'bold' }}>{stats.total}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{stats.count} Points Measured</div>
                </div>
            </div>

            {/* Floating Plan View */}
            {showPlan && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90%',
                    maxHeight: '80%',
                    background: 'white',
                    borderRadius: 20,
                    padding: 20,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    overflow: 'auto',
                    color: 'black'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                        <h3 style={{ margin: 0 }}>Project Plan</h3>
                        <button onClick={() => setShowPlan(false)} style={{ border: 'none', background: 'none', fontSize: 20 }}>✕</button>
                    </div>
                    <PlanParser role="user" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                </div>
            )}

            {/* Bottom Controls */}
            <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20 }}>
                <button
                    onClick={() => arSceneRef.current?.undo()}
                    style={{ padding: '12px 24px', borderRadius: 30, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(5px)' }}
                >
                    Undo
                </button>
                <button
                    onClick={() => arSceneRef.current?.startNewLine()}
                    style={{ padding: '12px 24px', borderRadius: 30, background: '#007bff', color: 'white', border: 'none', boxShadow: '0 5px 15px rgba(0,123,255,0.4)' }}
                >
                    New Room
                </button>
                <button
                    onClick={() => arSceneRef.current?.reset()}
                    style={{ padding: '12px 24px', borderRadius: 30, background: 'rgba(220,53,69,0.2)', color: 'white', border: '1px solid rgba(220,53,69,0.3)', backdropFilter: 'blur(5px)' }}
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default UserARView;