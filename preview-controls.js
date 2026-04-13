/**
 * Preview panel controls: Zoom, Reset, and Fullscreen functionality
 * Handles zoom in/out, reset zoom, and fullscreen mode for the preview panel
 */

let zoomLevel = 1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

document.addEventListener('DOMContentLoaded', () => {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const fullscreenBtn = document.getElementById('fullscreen-preview');
    const zoomStatus = document.getElementById('zoom-level-status');

    /**
     * Updates the zoom level of the SVG container
     */
    function updateZoom() {
        const container = document.getElementById('tikz-svg-container');
        if (container) {
            container.style.transform = `scale(${zoomLevel})`;
            container.style.transformOrigin = 'center center';
            
            // Update status bar
            if (zoomStatus) {
                zoomStatus.querySelector('span').textContent = `${Math.round(zoomLevel * 100)}%`;
            }

            // Update button states
            updateButtonStates();
        }
    }

    /**
     * Enable/disable zoom buttons based on current zoom level
     */
    function updateButtonStates() {
        if (zoomInBtn) {
            zoomInBtn.disabled = zoomLevel >= MAX_ZOOM;
            zoomInBtn.style.opacity = zoomLevel >= MAX_ZOOM ? '0.5' : '1';
        }
        if (zoomOutBtn) {
            zoomOutBtn.disabled = zoomLevel <= MIN_ZOOM;
            zoomOutBtn.style.opacity = zoomLevel <= MIN_ZOOM ? '0.5' : '1';
        }
    }

    /**
     * Zoom In
     */
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (zoomLevel < MAX_ZOOM) {
                zoomLevel = Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM);
                updateZoom();
            }
        });
    }

    /**
     * Zoom Out
     */
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (zoomLevel > MIN_ZOOM) {
                zoomLevel = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
                updateZoom();
            }
        });
    }

    /**
     * Reset Zoom to 100%
     */
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            zoomLevel = 1;
            updateZoom();
        });
    }

    /**
     * Fullscreen Mode
     */
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const preview = document.getElementById('preview');
            
            if (!document.fullscreenElement) {
                // Enter fullscreen
                if (preview.requestFullscreen) {
                    preview.requestFullscreen();
                } else if (preview.webkitRequestFullscreen) { // Safari
                    preview.webkitRequestFullscreen();
                } else if (preview.msRequestFullscreen) { // IE11
                    preview.msRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { // Safari
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { // IE11
                    document.msExitFullscreen();
                }
            }
        });

        // Update fullscreen button icon when entering/exiting fullscreen
        document.addEventListener('fullscreenchange', updateFullscreenIcon);
        document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
        document.addEventListener('msfullscreenchange', updateFullscreenIcon);
    }

    /**
     * Update fullscreen button icon
     */
    function updateFullscreenIcon() {
        const icon = fullscreenBtn?.querySelector('i');
        if (icon) {
            if (document.fullscreenElement) {
                icon.className = 'fas fa-compress'; // Exit fullscreen icon
            } else {
                icon.className = 'fas fa-expand'; // Enter fullscreen icon
            }
        }
    }

    /**
     * Mouse wheel zoom (optional - hold Ctrl + scroll)
     */
    const tikzOutput = document.getElementById('tikz-output');
    if (tikzOutput) {
        tikzOutput.addEventListener('wheel', (e) => {
            // Only zoom with Ctrl/Cmd key pressed
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                if (e.deltaY < 0) {
                    // Scroll up = Zoom in
                    if (zoomLevel < MAX_ZOOM) {
                        zoomLevel = Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM);
                        updateZoom();
                    }
                } else {
                    // Scroll down = Zoom out
                    if (zoomLevel > MIN_ZOOM) {
                        zoomLevel = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
                        updateZoom();
                    }
                }
            }
        }, { passive: false });
    }

    /**
     * Reset zoom when new diagram is rendered
     * (Called by mutation observer)
     */
    const observer = new MutationObserver(() => {
        // Check if a new SVG was added
        const container = document.getElementById('tikz-svg-container');
        if (container && container.querySelector('svg')) {
            // Optionally reset zoom on new render
            // Uncomment the next two lines if you want auto-reset:
            // zoomLevel = 1;
            // updateZoom();
        }
    });

    // Observe changes in the tikz-output container
    const outputDiv = document.getElementById('tikz-output');
    if (outputDiv) {
        observer.observe(outputDiv, { childList: true, subtree: true });
    }

    // Initialize button states
    updateButtonStates();
});