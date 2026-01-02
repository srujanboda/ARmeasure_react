import React, { useRef, useState, useEffect, useCallback } from 'react';

const drawShape = (ctx, points, fillColor, strokeColor) => {
    if (points.length < 1) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    if (points.length > 2) {
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
};

const PlanParser = ({ role = 'reviewer', sendData, remoteData, isDataConnected = false }) => {
    const canvasRef = useRef(null);
    const [image, setImage] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [savedRooms, setSavedRooms] = useState([]);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [status, setStatus] = useState("Step 1: Upload a floor plan image");
    const [isSaved, setIsSaved] = useState(false);
    const syncTimeoutRef = useRef(null);
    const pendingImageRef = useRef(null);
    const retryTimeoutRef = useRef(null);


    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (image) {
            if (canvas.width !== image.width || canvas.height !== image.height) {
                canvas.width = image.width;
                canvas.height = image.height;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
        } else {
            canvas.width = 800;
            canvas.height = 600;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.font = '20px Arial';
            ctx.fillText("Upload Floor Plan", 400, 300);
            return;
        }

        savedRooms.forEach(room => drawShape(ctx, room.points, room.color, "#28a745"));

        if (currentPoints.length > 0) {
            drawShape(ctx, currentPoints, "rgba(0, 123, 255, 0.5)", "#007bff");
            currentPoints.forEach(p => {
                ctx.fillStyle = "#007bff";
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }, [image, savedRooms, currentPoints]);

    // Load persisted data from localStorage on mount
    useEffect(() => {
        const storageKey = `planParser_${role}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.imageBase64) {
                    const img = new Image();
                    img.onload = () => {
                        setImage(img);
                        setImageBase64(data.imageBase64);
                        setIsSaved(true);
                        setStatus(role === 'user' ? "Loaded saved plan" : "Plan loaded");

                        // If user role and connection is ready, auto-send to reviewer
                        if (role === 'user' && isDataConnected && sendData) {
                            console.log("Auto-sending saved image to reviewer");
                            sendData({ type: 'PLAN_IMAGE', data: data.imageBase64 });
                            setStatus("Saved plan loaded and sent to reviewer");
                        } else if (role === 'user') {
                            // Store for sending when connection is ready
                            pendingImageRef.current = data.imageBase64;
                        }
                    };
                    img.src = data.imageBase64;
                }
                if (data.savedRooms) {
                    setSavedRooms(data.savedRooms);
                }
                if (data.currentPoints) {
                    setCurrentPoints(data.currentPoints);
                }
            } catch (e) {
                console.error("Error loading saved data:", e);
            }
        }
    }, [role, isDataConnected, sendData]);

    // Persist data to localStorage whenever it changes
    useEffect(() => {
        const storageKey = `planParser_${role}`;
        const dataToSave = {
            imageBase64,
            savedRooms,
            currentPoints
        };
        if (imageBase64 || savedRooms.length > 0 || currentPoints.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
    }, [imageBase64, savedRooms, currentPoints, role]);

    // Handle Remote Data - Real-time sync
    useEffect(() => {
        if (!remoteData) return;

        if (remoteData.type === 'PLAN_IMAGE') {
            const img = new Image();
            img.onload = () => {
                setImage(img);
                setImageBase64(remoteData.data);
                setStatus(role === 'reviewer' ? "Plan received from user" : "Plan saved and shared");
                setIsSaved(true);
            };
            img.src = remoteData.data;
        } else if (remoteData.type === 'PLAN_SYNC') {
            setSavedRooms(remoteData.savedRooms || []);
            setCurrentPoints(remoteData.currentPoints || []);
            if (role === 'reviewer') {
                setStatus("Markings synced with user");
            } else {
                setStatus("Reviewer is marking the plan... (Live updates)");
            }
        } else if (remoteData.type === 'PLAN_CLEAR') {
            setSavedRooms([]);
            setCurrentPoints([]);
            setStatus("Plan cleared");
        } else if (remoteData.type === 'PLAN_REMOVE_IMAGE') {
            setImage(null);
            setImageBase64(null);
            setSavedRooms([]);
            setCurrentPoints([]);
            setStatus("Image removed by other participant");
            setIsSaved(false);
            const storageKey = `planParser_${role}`;
            localStorage.removeItem(storageKey);
        }
    }, [remoteData, role]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Retry sending image when connection becomes ready
    useEffect(() => {
        if (isDataConnected && pendingImageRef.current && sendData) {
            console.log("Connection ready, sending pending image");
            const imageToSend = pendingImageRef.current;
            pendingImageRef.current = null;
            sendData({ type: 'PLAN_IMAGE', data: imageToSend });
            setStatus(role === 'user' ? "Image saved and sent to reviewer" : "Plan received from user");
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        }
    }, [isDataConnected, sendData, role]);

    // Save and send image to reviewer
    const saveAndSendImage = useCallback((base64, img) => {
        setImage(img);
        setImageBase64(base64);
        setIsSaved(true);

        // Store pending image if connection not ready
        if (!isDataConnected || !sendData) {
            console.log("Connection not ready, storing image for later");
            pendingImageRef.current = base64;
            setStatus("Image saved. Waiting for connection to reviewer...");
        } else {
            // Connection is ready, send immediately
            console.log("Connection ready, sending image immediately");
            sendData({ type: 'PLAN_IMAGE', data: base64 });
            setStatus("Image saved and sent to reviewer");
        }
    }, [sendData, isDataConnected]);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                const rawBase64 = f.target.result;
                const img = new Image();
                img.onload = () => {
                    // Compress Image
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                    const compressedImg = new Image();
                    compressedImg.onload = () => {
                        saveAndSendImage(compressedBase64, compressedImg);
                    };
                    compressedImg.src = compressedBase64;
                };
                img.src = rawBase64;
            };
            reader.readAsDataURL(file);
        }
    };

    // Manual save button handler (for user role)
    const handleSave = () => {
        if (imageBase64 && image) {
            setIsSaved(true);
            // Resend to reviewer
            if (isDataConnected && sendData) {
                sendData({ type: 'PLAN_IMAGE', data: imageBase64 });
                setStatus("Image saved and sent to reviewer");
            } else {
                pendingImageRef.current = imageBase64;
                setStatus("Image saved. Waiting for connection to reviewer...");
            }
        } else {
            alert("Please upload an image first");
        }
    };

    const handleCanvasClick = (e) => {
        if (!image || role !== 'reviewer') return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const newPoints = [...currentPoints, { x, y }];
        setCurrentPoints(newPoints);

        // Clear any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        // Real-time sync with debouncing for performance (50ms delay)
        syncTimeoutRef.current = setTimeout(() => {
            sendData?.({ type: 'PLAN_SYNC', currentPoints: newPoints, savedRooms });
        }, 50);
    };

    const finishRoom = () => {
        if (role !== 'reviewer') return;
        if (currentPoints.length > 2) {
            const newSaved = [...savedRooms, {
                points: [...currentPoints],
                color: "rgba(40, 167, 69, 0.4)"
            }];
            setSavedRooms(newSaved);
            setCurrentPoints([]);
            setStatus("Room Saved! Synced with user in real-time.");

            // Clear any pending sync
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }

            // Immediately broadcast saved room to user
            sendData?.({ type: 'PLAN_SYNC', currentPoints: [], savedRooms: newSaved });
        } else {
            alert("Please click at least 3 points to define a room area.");
        }
    };

    const clearAll = () => {
        if (role !== 'reviewer') return;
        setSavedRooms([]);
        setCurrentPoints([]);
        setStatus("Cleared. Synced with user.");
        // Clear any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }
        sendData?.({ type: 'PLAN_CLEAR' });
    };

    const handleClearImage = () => {
        if (window.confirm("Are you sure you want to remove the image and all markings?")) {
            setImage(null);
            setImageBase64(null);
            setSavedRooms([]);
            setCurrentPoints([]);
            setStatus("Image removed");
            setIsSaved(false);

            const storageKey = `planParser_${role}`;
            localStorage.removeItem(storageKey);

            if (isDataConnected && sendData) {
                sendData({ type: 'PLAN_REMOVE_IMAGE' });
            }
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);


    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="toolbar" style={{ background: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 20, color: 'black', width: '100%', maxWidth: '100%' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: 10, textAlign: 'center' }}>{status}</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <input type="file" accept="image/*" onChange={handleUpload} style={{ fontSize: 12 }} />
                    {role === 'user' && image && (
                        <button
                            onClick={handleSave}
                            style={{
                                backgroundColor: isSaved ? '#28a745' : '#007bff',
                                padding: '8px 16px',
                                borderRadius: 8,
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                            title={isSaved ? "Image saved and sent to reviewer" : "Save and send to reviewer"}
                        >
                            {isSaved ? '✓ Saved' : 'Save'}
                        </button>
                    )}
                    {role === 'reviewer' && (
                        <>
                            <button onClick={finishRoom} style={{ backgroundColor: '#007bff', padding: '8px 16px', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer' }}>Save Room</button>
                            <button onClick={clearAll} style={{ backgroundColor: '#dc3545', padding: '8px 16px', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer' }}>Clear</button>
                            {image && (
                                <button
                                    onClick={handleClearImage}
                                    style={{ backgroundColor: '#ff4d4d', padding: '8px 16px', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer' }}
                                    title="Remove image and markings"
                                >
                                    Remove Image
                                </button>
                            )}
                        </>
                    )}
                </div>
                {role === 'user' && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 10, textAlign: 'center' }}>
                        {image ? (
                            <>
                                {isSaved ? '✓ Image automatically saved and sent to reviewer. You will see markings in real-time as the reviewer works.' : 'Image uploaded. Click "Save" to send to reviewer.'}
                            </>
                        ) : (
                            'Upload a house plan image. It will be automatically saved and sent to the reviewer when you upload.'
                        )}
                    </div>
                )}
                {role === 'reviewer' && image && (
                    <div style={{ fontSize: 12, color: '#28a745', marginTop: 10, textAlign: 'center', fontWeight: 'bold' }}>
                        ✓ Real-time sync active: Your markings are visible to the user instantly
                    </div>
                )}
            </div>
            <div style={{
                border: '2px solid #ddd',
                borderRadius: 8,
                overflow: 'auto',
                width: '100%',
                maxHeight: '80vh',
                position: 'relative',
                background: '#eee'
            }} className="plan-canvas-container">
                <style>{`
                .plan-canvas-container::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                    display: block !important;
                }
                .plan-canvas-container::-webkit-scrollbar-track {
                    background: #242424;
                    box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
                    border-radius: 6px;
                }
                .plan-canvas-container::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, #007bff, #0056b3);
                    border-radius: 6px;
                    border: 2px solid #242424;
                }
                .plan-canvas-container::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(180deg, #008cff, #007bff);
                }
                .plan-canvas-container {
                    overflow: scroll !important;
                }
            `}</style>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasClick}
                    style={{
                        display: 'block',
                        cursor: role === 'reviewer' ? 'crosshair' : 'default',
                        margin: '0 auto'
                    }}
                />
            </div>
        </div>
    );
};

export default PlanParser;
