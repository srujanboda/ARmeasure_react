import React, { useRef, useState, useEffect } from 'react';

const PlanParser = ({ role = 'reviewer', sendData, remoteData }) => {
    const canvasRef = useRef(null);
    const [image, setImage] = useState(null);
    const [savedRooms, setSavedRooms] = useState([]);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [status, setStatus] = useState("Step 1: Upload a floor plan image");

    // Handle Remote Data
    useEffect(() => {
        if (!remoteData) return;

        if (remoteData.type === 'PLAN_IMAGE') {
            const img = new Image();
            img.onload = () => {
                setImage(img);
                setStatus("Shared Plan Received");
            };
            img.src = remoteData.data;
        } else if (remoteData.type === 'PLAN_SYNC') {
            setSavedRooms(remoteData.savedRooms || []);
            setCurrentPoints(remoteData.currentPoints || []);
            setStatus(role === 'reviewer' ? "Synced with User" : "Reviewer is marking the plan...");
        } else if (remoteData.type === 'PLAN_CLEAR') {
            setSavedRooms([]);
            setCurrentPoints([]);
        }
    }, [remoteData, role]);

    useEffect(() => {
        draw();
    }, [image, savedRooms, currentPoints]);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                const base64 = f.target.result;
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    setStatus("Image Uploaded & Shared");
                    // Broadcast image
                    sendData?.({ type: 'PLAN_IMAGE', data: base64 });
                };
                img.src = base64;
            };
            reader.readAsDataURL(file);
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

        // Broadcast change
        sendData?.({ type: 'PLAN_SYNC', currentPoints: newPoints, savedRooms });
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
            setStatus("Room Saved! Shared with User.");

            // Broadcast
            sendData?.({ type: 'PLAN_SYNC', currentPoints: [], savedRooms: newSaved });
        } else {
            alert("Please click at least 3 points to define a room area.");
        }
    };

    const clearAll = () => {
        if (role !== 'reviewer') return;
        setSavedRooms([]);
        setCurrentPoints([]);
        setStatus("Cleared.");
        sendData?.({ type: 'PLAN_CLEAR' });
    };

    const draw = () => {
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
    };

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="toolbar" style={{ background: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 20, color: 'black', width: '100%', maxWidth: 600 }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: 10, textAlign: 'center' }}>{status}</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <input type="file" accept="image/*" onChange={handleUpload} style={{ fontSize: 12 }} />
                    {role === 'reviewer' && (
                        <>
                            <button onClick={finishRoom} style={{ backgroundColor: '#007bff', padding: '8px 16px', borderRadius: 8, color: 'white' }}>Save Room</button>
                            <button onClick={clearAll} style={{ backgroundColor: '#dc3545', padding: '8px 16px', borderRadius: 8, color: 'white' }}>Clear</button>
                        </>
                    )}
                </div>
                {role === 'user' && (
                    <div style={{ fontSize: 12, color: '#666', marginTop: 10, textAlign: 'center' }}>
                        You can upload the plan. Marking is done by the reviewer.
                    </div>
                )}
            </div>
            <div style={{ border: '2px solid #ddd', borderRadius: 8, overflow: 'hidden', maxWidth: '100%', maxHeight: '70vh', overflowY: 'auto' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasClick}
                    style={{
                        display: 'block',
                        maxWidth: '100%',
                        height: 'auto',
                        cursor: role === 'reviewer' ? 'crosshair' : 'default'
                    }}
                />
            </div>
        </div>
    );
};

export default PlanParser;
