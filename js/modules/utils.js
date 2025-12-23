
export function formatDistance(meters, unit) {
    if (unit === 'ft') return (meters * 3.28084).toFixed(2) + ' ft';
    if (unit === 'in') return (meters * 39.3701).toFixed(1) + ' in';
    return meters.toFixed(2) + ' m';
}
