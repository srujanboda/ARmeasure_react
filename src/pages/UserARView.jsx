import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ARScene from '../components/ARScene';
import { usePeer } from '../hooks/usePeer';
import PlanParser from '../components/PlanParser';

const UserARView = () => {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');
    const { status } = usePeer('user', code); // Auto-calls reviewer
    const arRef = useRef(null);
    const [stats, setStats] = useState({ total: "0.00 m", count: 0 });
    const [showPlanParser, setShowPlanParser] = useState(false);


    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <ARScene ref={arRef} onStatsUpdate={setStats} />

            {/* Top Bar for Stats */}
            <div style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: 20,
                fontSize: 24,
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'none' // Let clicks pass through if needed
            }}>
                Total: <span style={{ color: '#ff4444' }}>{stats.total}</span> • {stats.count} pts
            </div>

            {/* Right Side Dock for Tools */}
            <div style={{
                position: 'fixed',
                top: '50%',
                right: 20,
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 15
            }}>
                {/* Unit Change Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); arRef.current?.cycleUnit(); }}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: 'white',
                        color: 'black',
                        border: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                    Unit
                </button>

                {/* Plan Parser Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowPlanParser(true); }}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>
            </div>

            {/* Bottom Controls - Moved up slightly to avoid "STOP AR" */}
            {stats.count > 0 && (
                <div style={{ position: 'fixed', bottom: 80, width: '100%', display: 'flex', justifyContent: 'center', gap: 20, pointerEvents: 'auto' }}>
                    <button onClick={(e) => { e.stopPropagation(); arRef.current?.undo(); }} style={{ background: '#555', borderRadius: 20, padding: '10px 20px', color: 'white', border: 'none' }}>
                        Undo
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); arRef.current?.startNewLine(); }} style={{ background: '#007bff', borderRadius: 20, padding: '10px 20px', color: 'white', border: 'none' }}>
                        New Line
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); arRef.current?.reset(); }} style={{ background: '#dc3545', borderRadius: 20, padding: '10px 20px', color: 'white', border: 'none' }}>
                        Reset
                    </button>
                </div>
            )}

            {/* Plan Parser Modal */}
            {showPlanParser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'white',
                    zIndex: 2000,
                    overflowY: 'auto',
                    padding: 20
                }}>
                    <button
                        onClick={() => setShowPlanParser(false)}
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: 'transparent',
                            color: 'black',
                            fontSize: 24,
                            border: 'none'
                        }}
                    >
                        ✕
                    </button>
                    <h2>Plan Parser</h2>
                    <PlanParser />
                </div>
            )}
        </div>
    );
};

export default UserARView;
