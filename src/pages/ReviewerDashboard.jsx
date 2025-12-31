import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PlanParser from '../components/PlanParser';
import { usePeer } from '../hooks/usePeer';

const ReviewerDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const code = searchParams.get('code');
    const { status, remoteStream, endCall, sendData, data: remoteData, isDataConnected } = usePeer('reviewer', code);
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const handleEndCall = () => {
        endCall();
        navigate('/');
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1>Reviewer Dashboard</h1>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ padding: '10px 20px', background: '#333', borderRadius: 8, color: 'white' }}>
                        Code: <strong>{code}</strong> ({status})
                    </div>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Video Column */}
                <div style={{ background: '#222', borderRadius: 12, padding: 20, minHeight: 400 }}>
                    <h3>User View</h3>
                    <div style={{ width: '100%', height: 300, background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%' }}></video>
                    </div>
                </div>

                {/* Plan Column */}
                <div>
                    <h3>Floor Plan Verification</h3>
                    <PlanParser role="reviewer" sendData={sendData} remoteData={remoteData} isDataConnected={isDataConnected} />
                </div>
            </div>
        </div>
    );
};

export default ReviewerDashboard;
