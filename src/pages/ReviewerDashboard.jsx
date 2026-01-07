import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const ReviewerDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const { status, remoteStream, endCall, sendData, data: remoteData, isDataConnected, isMuted, toggleMic } = usePeer('reviewer', code);
    const videoRef = useRef(null);

    // Live measurements from user's AR session
    const [liveMeasurements, setLiveMeasurements] = useState(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && remoteStream) {
            video.srcObject = remoteStream;
            video.play().catch(err => {
                console.error("Error playing video:", err);
            });
        } else if (video && !remoteStream) {
            video.srcObject = null;
        }

        return () => {
            if (video) {
                video.srcObject = null;
            }
        };
    }, [remoteStream]);

    // Handle incoming measurement data from user
    useEffect(() => {
        if (remoteData && remoteData.type === 'MEASUREMENT_SYNC') {
            setLiveMeasurements(remoteData.payload);
        }
    }, [remoteData]);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    return (
        <div style={{ padding: '10px 1%', maxWidth: '100%', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>Reviewer Dashboard</h1>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ padding: '10px 20px', background: '#333', borderRadius: 8, color: 'white' }}>
                        Code: <strong>{code}</strong> ({status})
                    </div>
                    <button
                        onClick={toggleMic}
                        className={`glass-btn ${isMuted ? 'glass-btn-danger' : ''}`}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            background: isMuted ? 'rgba(220,53,69,0.5)' : 'rgba(0,191,255,0.4)',
                            border: isMuted ? '2px solid rgba(220,53,69,0.3)' : '2px solid rgba(0,191,255,0.3)'
                        }}
                    >
                        {isMuted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={handleEndCall}
                        className="glass-btn glass-btn-danger"
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
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Video Column - Equal width with Plan Parser */}
                <div style={{
                    background: '#222',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minHeight: '85vh',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <h3 style={{ margin: 0, color: '#fff' }}>User View</h3>
                        {remoteStream && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                background: 'rgba(40, 167, 69, 0.2)',
                                borderRadius: 20,
                                border: '1px solid rgba(40, 167, 69, 0.5)'
                            }}>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: '#28a745'
                                }}></div>
                                <span style={{ fontSize: 12, color: '#28a745', fontWeight: 'bold' }}>LIVE</span>
                            </div>
                        )}
                    </div>
                    <div style={{
                        width: '100%',
                        height: '80vh',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 0 20px rgba(0,123,255,0.1)',
                        margin: '0 auto',
                        position: 'relative'
                    }}>
                        {remoteStream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    display: 'block'
                                }}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#888',
                                textAlign: 'center',
                                padding: 40
                            }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    border: '3px solid #444',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 20
                                }}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#666' }}>
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#aaa' }}>
                                    Waiting for User Stream
                                </div>
                                <div style={{ fontSize: 14, color: '#666' }}>
                                    {status.includes('Waiting') || status.includes('not online') ? (
                                        'User is connecting...'
                                    ) : status.includes('Connected') ? (
                                        'Stream starting...'
                                    ) : (
                                        status
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Live Measurements Panel */}
                    {liveMeasurements && (
                        <div style={{
                            marginTop: 15,
                            padding: 16,
                            background: liveMeasurements.isActive ? 'rgba(0, 191, 255, 0.1)' : 'rgba(100, 100, 100, 0.2)',
                            borderRadius: 12,
                            border: liveMeasurements.isActive ? '2px solid rgba(0, 191, 255, 0.4)' : '1px solid rgba(100, 100, 100, 0.3)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00BFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 12h20M12 2v20"></path>
                                    </svg>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Live Measurements</span>
                                </div>
                                {liveMeasurements.isActive ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '4px 10px',
                                        background: 'rgba(40, 167, 69, 0.3)',
                                        borderRadius: 12,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#28a745'
                                    }}>
                                        <div style={{ width: 6, height: 6, background: '#28a745', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                        AR ACTIVE
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '4px 10px',
                                        background: 'rgba(100, 100, 100, 0.3)',
                                        borderRadius: 12,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#888'
                                    }}>
                                        AR ENDED
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{
                                    padding: 12,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 8,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 11, color: '#00BFFF', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Total Distance</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{liveMeasurements.total || '0.00 m'}</div>
                                </div>
                                <div style={{
                                    padding: 12,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 8,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 11, color: '#00BFFF', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Points</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{liveMeasurements.count || 0}</div>
                                </div>
                            </div>

                            {liveMeasurements.area && (
                                <div style={{
                                    marginTop: 12,
                                    padding: 12,
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 8,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 11, color: '#28a745', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Area</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#28a745' }}>{liveMeasurements.area}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Plan Column - Equal width with User View */}
                <div style={{
                    background: '#222',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minHeight: '85vh',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: 15, color: '#fff' }}>Floor Plan Verification</h3>
                    <div style={{ flex: 1, width: '100%', overflow: 'auto', minWidth: 0 }}>
                        <PlanParser role="reviewer" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
