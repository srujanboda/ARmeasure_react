import { useEffect, useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';

export const usePeer = (role, code, arActive = false) => {
    const [peer, setPeer] = useState(null);
    const [call, setCall] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const [conn, setConn] = useState(null);
    const [data, setData] = useState(null);
    const [isDataConnected, setIsDataConnected] = useState(false);
    const localStreamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isMuted, setIsMuted] = useState(false);

    function getVideoConstraints(mode, isAR) {
        const constraints = {
            facingMode: { ideal: mode },
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 20, max: 30 }
        };
        if (isAR) {
            constraints.width = { ideal: 640 };
            constraints.height = { ideal: 480 };
            constraints.frameRate = { ideal: 12, max: 15 };
        }
        return constraints;
    }

    const setupCallEvents = useCallback((activeCall) => {
        setCall(activeCall);
        activeCall.on('stream', (stream) => {
            console.log("Remote Stream received");
            setRemoteStream(stream);
            if (role === 'reviewer') {
                setStatus(`Connected - Receiving stream from ${activeCall.peer}`);
            } else {
                setStatus(`Connected - Streaming to ${activeCall.peer}`);
            }
        });
        activeCall.on('close', () => {
            setStatus("Call Ended");
            setCall(null);
            setRemoteStream(null);
        });
        activeCall.on('error', (err) => {
            console.error("Call error:", err);
            setStatus(`Call Error: ${err.message || err.type}`);
        });
    }, [role]);

    const setupDataEvents = useCallback((dataConn) => {
        setConn(dataConn);
        dataConn.on('data', (receivedData) => {
            console.log("Data received:", receivedData?.type);
            setData(receivedData);
        });
        dataConn.on('open', () => {
            console.log("Data connection open with:", dataConn.peer);
            setIsDataConnected(true);
        });
        dataConn.on('close', () => {
            setConn(null);
            setIsDataConnected(false);
        });
        dataConn.on('error', (err) => {
            console.error("Data connection error:", err);
            setIsDataConnected(false);
        });
    }, []);

    const startCall = useCallback(async (p, targetId) => {
        setStatus(`Calling ${targetId}...`);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(facingMode, arActive)
            });
            localStreamRef.current = stream;
            const outgoingCall = p.call(targetId, stream);
            setupCallEvents(outgoingCall);
        } catch (e) {
            console.error("Media Error:", e);
            setStatus("Media Error: " + e.message);
        }
    }, [facingMode, arActive, setupCallEvents]);

    const refreshMediaTracks = useCallback(async () => {
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(facingMode, arActive)
            });
            localStreamRef.current = newStream;
            if (call && call.peerConnection) {
                const videoTrack = newStream.getVideoTracks()[0];
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }
        } catch (e) {
            console.error("Error refreshing media tracks:", e);
        }
    }, [facingMode, arActive, call]);

    useEffect(() => {
        if (!code) return;
        const myId = role === 'reviewer' ? `${code}-reviewer` : `${code}-user`;
        const targetId = role === 'reviewer' ? `${code}-user` : `${code}-reviewer`;
        setStatus("Connecting to Server...");
        const p = new Peer(myId);

        p.on('open', (id) => {
            console.log("Peer opened with ID:", id);
            setStatus(role === 'reviewer' ? "Waiting for someone to join..." : "Ready to call...");
            setPeer(p);
            if (role === 'user') {
                startCall(p, targetId);
                const dataConn = p.connect(targetId);
                setupDataEvents(dataConn);
            }
        });

        p.on('connection', (dataConn) => {
            console.log("Incoming data connection-from:", dataConn.peer);
            setupDataEvents(dataConn);
        });

        p.on('call', (incomingCall) => {
            console.log("Incoming call...", incomingCall);
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(facingMode, arActive)
            })
                .then(stream => {
                    localStreamRef.current = stream;
                    incomingCall.answer(stream);
                    setupCallEvents(incomingCall);
                    setStatus(`Call connected with ${incomingCall.peer}`);
                })
                .catch(err => {
                    console.error("Failed to get media for answering call:", err);
                    setStatus(`Error answering call: ${err.message}`);
                });
        });

        p.on('disconnected', () => {
            setStatus("Disconnected from server. Retrying...");
            p.reconnect();
        });

        p.on('error', (err) => {
            console.error("Peer Error:", err);
            setStatus(`Error: ${err.type}`);
            if (err.type === 'peer-unavailable') {
                setStatus(role === 'user' ? "Reviewer not online yet..." : "User not found...");
            }
        });

        return () => {
            p.destroy();
        };
    }, [role, code, startCall, setupCallEvents, setupDataEvents, facingMode, arActive]);

    useEffect(() => {
        if (role === 'user' && call && call.peerConnection) {
            refreshMediaTracks();
        }
    }, [arActive, role, call, refreshMediaTracks]);

    const sendData = (payload) => {
        if (!conn) {
            console.warn("sendData failed: No connection object");
            return;
        }
        if (!conn.open) {
            console.warn("sendData failed: Connection is not open", conn.peer, conn.metadata);
            return;
        }
        try {
            conn.send(payload);
            console.log("Data sent:", payload.type);
        } catch (e) {
            console.error("sendData exception:", e);
        }
    };

    // Start screen sharing and replace video track
    const startScreenShare = async () => {
        try {
            // Check if getDisplayMedia is supported
            if (!navigator.mediaDevices.getDisplayMedia) {
                console.error("Screen sharing not supported on this device");
                return { success: false, error: "Screen sharing not supported" };
            }

            console.log("Requesting screen share...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 15 }
                },
                audio: false // We keep using the original audio
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) {
                return { success: false, error: "No video track from screen share" };
            }

            // Handle screen share stop (when user clicks "Stop sharing")
            screenTrack.onended = () => {
                console.log("Screen share ended by user");
                setStatus("Screen share ended");
            };

            // Replace the video track in the peer connection
            if (call && call.peerConnection) {
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video' || s.track === null);

                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                    console.log("Screen share track replaced successfully");
                    setStatus("Screen sharing active");
                    return { success: true };
                } else {
                    return { success: false, error: "No video sender found" };
                }
            } else {
                return { success: false, error: "No active call" };
            }
        } catch (e) {
            console.error("Screen share error:", e);
            if (e.name === 'NotAllowedError') {
                return { success: false, error: "Permission denied" };
            }
            return { success: false, error: e.message };
        }
    };

    // Replace video track with a new track (e.g., canvas stream for AR)
    const replaceVideoTrack = async (newVideoTrack) => {
        console.log("replaceVideoTrack called, call:", !!call, "peerConnection:", !!call?.peerConnection, "newTrack:", !!newVideoTrack);

        if (!call || !call.peerConnection) {
            console.error("No active call or peerConnection");
            return false;
        }

        if (!newVideoTrack) {
            console.error("No new video track provided");
            return false;
        }

        try {
            const senders = call.peerConnection.getSenders();
            console.log("Found senders:", senders.length);

            // Find video sender - check for video track OR null track (when old track was stopped)
            let videoSender = senders.find(s => s.track?.kind === 'video');

            // If no video track found, look for sender that could be a video sender
            if (!videoSender) {
                // Try to find by looking at all senders and their capabilities
                videoSender = senders.find(s => {
                    if (!s.track && s.getParameters) {
                        const params = s.getParameters();
                        return params.codecs?.some(c => c.mimeType?.includes('video'));
                    }
                    return false;
                });
            }

            // Last resort: use the first sender with null track
            if (!videoSender) {
                videoSender = senders.find(s => s.track === null);
            }

            if (videoSender) {
                await videoSender.replaceTrack(newVideoTrack);
                console.log("Video track replaced successfully");
                setStatus("Streaming AR view to reviewer");
                return true;
            } else {
                console.error("No video sender found in:", senders.map(s => s.track?.kind || 'null'));
            }
        } catch (e) {
            console.error("Failed to replace video track:", e);
        }
        return false;
    };

    const toggleCamera = async () => {
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: getVideoConstraints(nextMode, arActive)
            });
            localStreamRef.current = newStream;
            if (call && call.peerConnection) {
                const videoTrack = newStream.getVideoTracks()[0];
                const senders = call.peerConnection.getSenders();
                const videoSender = senders.find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }
            setStatus(`Switched to ${nextMode} camera`);
        } catch (e) {
            console.error("Error switching camera:", e);
            setStatus("Camera switch error: " + e.message);
        }
    };

    const toggleMic = () => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            const newMutedState = !isMuted;
            setIsMuted(newMutedState);
            setStatus(newMutedState ? "Microphone muted" : "Microphone unmuted");
        }
    };

    const endCall = () => {
        if (call) call.close();
        if (peer) peer.destroy();

        // Stop all local tracks (Camera/Mic)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        setCall(null);
        setPeer(null);
        setRemoteStream(null);
        setConn(null);
        setIsDataConnected(false);
        setStatus("Call Ended Manually");
    };

    return { peer, call, remoteStream, status, endCall, sendData, data, isDataConnected, toggleCamera, facingMode, isMuted, toggleMic, replaceVideoTrack, startScreenShare };
};
