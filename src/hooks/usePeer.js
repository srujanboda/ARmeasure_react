import { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';

export const usePeer = (role, code) => {
    const [peer, setPeer] = useState(null);
    const [call, setCall] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState("Initializing...");
    const [conn, setConn] = useState(null);
    const [data, setData] = useState(null);
    const localStreamRef = useRef(null);

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
                // Initiate data connection
                const dataConn = p.connect(targetId);
                setupDataEvents(dataConn);
            }
        });

        p.on('connection', (dataConn) => {
            console.log("Incoming data connection from:", dataConn.peer);
            setupDataEvents(dataConn);
        });

        p.on('call', (incomingCall) => {
            console.log("Incoming call...", incomingCall);
            // ... (rest of call answering logic remains same)
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
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

        p.on('close', () => {
            setStatus("Connection closed.");
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
    }, [role, code]);

    const setupDataEvents = (dataConn) => {
        setConn(dataConn);
        dataConn.on('data', (receivedData) => {
            console.log("Data received:", receivedData?.type);
            setData(receivedData);
        });
        dataConn.on('open', () => {
            console.log("Data connection open with:", dataConn.peer);
        });
        dataConn.on('close', () => {
            setConn(null);
        });
    };

    const sendData = (payload) => {
        if (conn && conn.open) {
            conn.send(payload);
        } else {
            console.warn("Cannot send data: connection not open");
        }
    };
    // ... startCall and setupCallEvents remain unchanged ...
    const startCall = async (p, targetId) => {
        setStatus(`Calling ${targetId}...`);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            const outgoingCall = p.call(targetId, stream);
            setupCallEvents(outgoingCall);
        } catch (e) {
            console.error("Media Error:", e);
            setStatus("Media Error: " + e.message);
        }
    };

    const setupCallEvents = (activeCall) => {
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
    };

    const endCall = () => {
        if (call) call.close();
        if (peer) peer.destroy();
        setCall(null);
        setPeer(null);
        setRemoteStream(null);
        setConn(null);
        setStatus("Call Ended Manually");
    };

    return { peer, call, remoteStream, status, endCall, sendData, data };
};
