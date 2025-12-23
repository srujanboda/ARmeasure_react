
// js/app.js - Modular Refactor
import { SceneManager } from './modules/scene.js';
import { UI } from './modules/ui.js';
import { MeasureManager } from './modules/measure.js';
import { InteractionManager } from './modules/interactions.js';
import { formatDistance } from './modules/utils.js';

class App {
  constructor() {
    this.currentUnit = 'm';

    // Modules
    this.sceneManager = null;
    this.ui = null;
    this.measureManager = null;
    this.interactionManager = null;

    this.init();
  }

  init() {
    // 1. Setup UI with callbacks controls
    this.ui = new UI({
      onUndo: () => this.measureManager.undoLastPoint(),
      onReset: () => this.measureManager.resetAll(),
      onNewLine: () => this.measureManager.startNewLine(),
      onExit: () => this.exitApp(),
      onUnitChange: (unit) => {
        this.currentUnit = unit;
        this.measureManager.setUnit(unit);
        this.updateUI(); // Refresh totals
      }
    });
    this.ui.init();

    // 2. Setup Scene
    this.sceneManager = new SceneManager(
      (t, frame) => this.render(t, frame),
      () => this.onSessionStart(),
      () => this.onSessionEnd()
    );
    this.sceneManager.init();

    // 3. Setup Managers
    this.measureManager = new MeasureManager(this.sceneManager.scene);
    this.interactionManager = new InteractionManager(
      this.sceneManager.scene,
      this.sceneManager.renderer,
      this.sceneManager.camera
    );

    // 4. Input Listeners
    this.sceneManager.controller.addEventListener('select', () => this.handleTap());
    document.body.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') this.handleTap();
    });

    // Wall Detection / Video feed setup could go here or in a separate module
    // For simplicity, keeping the camera feed logic here or in scene manager if we want to clean up totally.
    // The original code had video element creation in `init`. Let's add that to SceneManager or just keep it simple here.
    this.setupVideoPassThrough();
  }

  setupVideoPassThrough() {
    // Quick setup for the video background if needed for non-WebXR devices or fallback
    // The original App had a video element.
    const video = document.createElement('video');
    video.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;z-index:-1;';
    video.autoplay = true; video.muted = true; video.playsInline = true;
    document.body.appendChild(video);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { video.srcObject = s; video.play(); })
      .catch(e => console.log("Camera access denied or not needed inside XR"));
  }

  onSessionStart() {
    this.ui.setSessionActive(true);
  }

  onSessionEnd() {
    this.ui.setSessionActive(false);
  }

  handleTap() {
    // Add point if reticle is visible
    const pos = this.interactionManager.getReticlePosition();
    if (pos && this.measureManager.getPointCount() < 20) {
      this.measureManager.addPoint(pos);
      this.updateUI();
    }
  }

  render(t, frame) {
    // Update interactions (Reticle)
    const session = this.sceneManager.getSession();
    this.interactionManager.update(frame, session);

    // Update UI info based on WallMode from interaction
    const isWallMode = this.interactionManager.isWallMode;

    if (this.measureManager.getPointCount() < 2) {
      const wallText = isWallMode ? `<span style="color:#00ffff">WALL MODE</span> – Tap to place` : `Total: <span style="color:#ff4444">0.00 ${this.currentUnit}</span> • 0 pts`;
      this.ui.updateInfo(wallText);
      // Also manage canvas opacity if needed (originally canvas opacity changed)
    } else {
      this.updateUI();
    }
  }

  updateUI() {
    // Update Total Distance Text
    const dist = this.measureManager.getTotalDistance();
    const text = formatDistance(dist, this.currentUnit);
    const count = this.measureManager.getPointCount();

    this.ui.updateInfo(`Total: <span style="color:#ff4444;font-size:26px">${text}</span> • ${count} pts`);

    // Update Buttons
    this.ui.updateControls(
      this.measureManager.hasContent(),
      count >= 2
    );
  }

  exitApp() {
    const session = this.sceneManager.getSession();
    if (session) session.end();
    window.location.reload();
  }
}

// Start App
new App();
