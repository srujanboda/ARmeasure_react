
export class UI {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.infoDiv = null;
        this.resetBtn = null;
        this.undoBtn = null;
        this.unitBtn = null;
        this.newLineBtn = null;
        this.exitBtn = null;
        this.currentUnit = 'm';
    }

    init() {
        this.createStyles();
        this.infoDiv = this.createElement('div', `
            position:fixed; top:16px; left:50%; transform:translateX(-50%);
            background:rgba(0,0,0,0.85); color:white; padding:12px 32px;
            border-radius:20px; font:bold 20px system-ui; z-index:999; pointer-events:none;
        `, `Total: <span style="color:#ff4444">0.00 m</span> • 0 pts`);

        this.undoBtn = this.createElement('button', `
            position:fixed; bottom:40px; right:30px; z-index:999;
            width:60px; height:60px; border-radius:30px;
            background:#222; color:white; border:1px solid #444;
            display:none; align-items:center; justify-content:center;
            box-shadow:0 4px 12px rgba(0,0,0,0.5);
        `, '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>');
        this.undoBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.onUndo(); };

        this.unitBtn = this.createElement('button', `
            position:fixed; top:90px; left:20px; z-index:9999;
            width:56px; height:56px; border-radius:50%;
            background:#0066ff; color:white; border:none;
            font:bold 20px system-ui; box-shadow:0 8px 25px rgba(0,102,255,0.5);
            display:flex; align-items:center; justify-content:center;
        `, 'm');
        this.unitBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleUnit();
            this.callbacks.onUnitChange(this.currentUnit);
        };

        this.resetBtn = this.createElement('button', `
            position:fixed; top:20px; right:20px; z-index:999;
            padding:12px 24px; font:bold 16px system-ui; background:#ff3333; color:white;
            border:none; border-radius:30px; box-shadow:0 6px 20px rgba(0,0,0,0.5); display:none;
        `, 'Reset');
        this.resetBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.onReset(); };

        this.newLineBtn = this.createElement('button', `
            position:fixed; top:20px; left:20px; z-index:999;
            width:56px; height:56px; border-radius:50%;
            background:#444; color:white; border:1px solid #666;
            box-shadow:0 6px 20px rgba(0,0,0,0.5);
            display:none; align-items:center; justify-content:center;
        `, '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>');
        this.newLineBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.onNewLine(); };

        this.exitBtn = this.createElement('button', `
            position:fixed; bottom:40px; left:50%; transform:translateX(-50%); z-index:999;
            padding:12px 30px; font-size:18px; font-weight:bold;
            background:#ff3333; color:white; border:none; border-radius:30px;
            box-shadow:0 4px 15px rgba(255, 0, 0, 0.4);
            display:none;
        `, 'Exit');
        this.exitBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.onExit(); };
    }

    createElement(tag, css, html) {
        const el = document.createElement(tag);
        el.style.cssText = css;
        el.innerHTML = html;
        document.body.appendChild(el);
        return el;
    }

    toggleUnit() {
        if (this.currentUnit === 'm') this.currentUnit = 'ft';
        else if (this.currentUnit === 'ft') this.currentUnit = 'in';
        else this.currentUnit = 'm';
        this.unitBtn.textContent = this.currentUnit;
    }

    updateInfo(text) {
        this.infoDiv.innerHTML = text;
    }

    updateControls(hasPoints, canNewLine) {
        this.undoBtn.style.display = this.resetBtn.style.display = hasPoints ? 'flex' : 'none'; // changed block to flex for undoBtn alignment
        this.newLineBtn.style.display = canNewLine ? 'flex' : 'none';
    }

    setSessionActive(active) {
        this.exitBtn.style.display = active ? 'block' : 'none';
        const arBtn = document.querySelector('.custom-ar-button'); // Helper to toggle the main AR button
        if (arBtn) arBtn.style.display = active ? 'none' : 'block'; // block/flex depend on original css
    }

    createStyles() {
        // Any extra global styles if needed
    }
}
