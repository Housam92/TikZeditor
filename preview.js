// Preview rendering functionality
import { mapTikzToSvg } from './tikzSvgMapper.js';
import { svgMonacoInteractionService } from './services/svgMonacoInteractionService.js';
import { tikzProcessingService } from './services/tikzProcessingService.js';

/**
 * Sets up a live TikZ preview for a Monaco editor instance.
 * ⚠️ NOTE: This function NO LONGER sets up automatic rendering.
 * Auto-rendering is now controlled by the checkbox in renderer.js
 * 
 * @param {monaco.editor.IStandaloneCodeEditor} editor - The Monaco editor instance containing TikZ code.
 * @param {string} outputId - The ID of the HTML element where the preview should be rendered.
 */
export function setupPreview(editor, outputId) {
    // Click handler for highlighting lines in SVG
    editor.onMouseDown((e) => {
        const lineNumber = e.target.position.lineNumber;
        svgMonacoInteractionService.handleEditorLineHighlight(lineNumber);
    });

    // Initial preview render
    updatePreview(editor, outputId);
}

/**
 * Configuration options for TikZ to SVG mapping.
 * @typedef {Object} PreviewConfig
 * @property {boolean} strictMapping - If true, only precise 1:1 mappings between TikZ lines and SVG elements are allowed.
 * @property {boolean} visualFeedback - If true, visual cues show mapping quality.
 */
export const previewConfig = {
    strictMapping: false,
    visualFeedback: true
};

/**
 * Updates the preview output for the given editor and container.
 * Processes the TikZ code, renders SVG, and maps SVG elements to TikZ lines.
 * Falls back to iframe isolation if direct rendering fails.
 *
 * @param {monaco.editor.IStandaloneCodeEditor} editor - The Monaco editor instance.
 * @param {string} outputId - The ID of the container element for the preview.
 * @param {PreviewConfig} [config=previewConfig] - Optional configuration for SVG mapping.
 */
export function updatePreview(editor, outputId, config = previewConfig) {
    const tikzCode = editor.getValue();
    const outputDiv = document.getElementById(outputId);
    if (!outputDiv) {
        console.error('Preview output div not found');
        return;
    }

    // Clear previous content
    outputDiv.innerHTML = '';

    // Placeholder if input is empty or lacks TikZ environment
    const hasTikz = /\\begin{tikzpicture}/.test(tikzCode);
    if (!tikzCode.trim() || !hasTikz) {
        outputDiv.innerHTML = `
      <div id="placeholder-message" style="
        color: #bbb;
        font-size: 18px;
        text-align: center;
        padding-top: 40px;
      ">
        TikZ Preview will appear here
      </div>`;
        return;
    }

    // Show loading indicator
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Rendering diagram…';
    outputDiv.appendChild(loading);

    // Container for rendered SVG
    const svgContainer = document.createElement('div');
    svgContainer.id = 'tikz-svg-container';
    outputDiv.appendChild(svgContainer);

    const removePlaceholders = () => {
        outputDiv.querySelectorAll('.loading, #placeholder-message').forEach(el => el.remove());
    };

    try {
        // Preprocess TikZ code to include line number comments
        const preprocessedTikz = tikzProcessingService.preprocessWithLineNumbers(tikzCode);

        const tempScript = document.createElement('script');
        tempScript.type = 'text/tikz';
        tempScript.textContent = preprocessedTikz;
        outputDiv.appendChild(tempScript);

        if (window.TikZ) {
            try {
                // Process TikZ using TikzJax
                window.TikZ.processPage();
                removePlaceholders();

                const svg = outputDiv.querySelector('svg');
                if (svg) {
                    const svgString = svg.outerHTML;
                    // Map SVG elements to TikZ lines using provided config
                    const updatedSvg = mapTikzToSvg(tikzCode, svgString, config);
                    svgContainer.innerHTML = updatedSvg;

                    // Initialize interactive SVG highlighting
                    svgMonacoInteractionService.initialize(editor, svgContainer);
                }
            } catch {
                renderFallback(editor, tikzCode, svgContainer, removePlaceholders);
            }
        } else {
            renderFallback(editor, tikzCode, svgContainer, removePlaceholders);
        }
    } catch {
        renderFallback(editor, tikzCode, svgContainer, removePlaceholders);
    }
}

/**
 * fallback renderer for TikZ diagrams.
 * uses an isolated iframe to process TikZ code when direct processing fails.
 * attempts t rendering multiple times before showing an error message.
 *
 * @param {monaco.editor.IStandaloneCodeEditor} editor - The Monaco editor instance
 * @param {string} tikzCode - The TikZ code to rendering
 * @param {HTMLElement} svgContainer - The container where the SVG should be injected
 * @param {Function} removePlaceholders - Function to remove loading or placeholder elements
 */
function renderFallback(editor, tikzCode, svgContainer, removePlaceholders) {
    try {
        const preprocessedTikz = tikzProcessingService.preprocessWithLineNumbers(tikzCode);

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://tikzjax.com/v1/tikzjax.js"></script>
      </head>
      <body>
        <script type="text/tikz">${preprocessedTikz}</script>
      </body>
      </html>
    `);
        iframeDoc.close();

        let attempts = 0;
        const maxAttempts = 5;

        const checkForSVG = () => {
            const svg = iframeDoc.querySelector('svg');
            if (svg) {
                const svgString = svg.outerHTML;
                const updatedSvg = mapTikzToSvg(tikzCode, svgString);
                svgContainer.innerHTML = updatedSvg;

                svgMonacoInteractionService.initialize(editor, svgContainer);

                document.body.removeChild(iframe);
                removePlaceholders();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkForSVG, 800);
            } else {
                console.error('TikZ rendering failed after multiple attempts', tikzCode);
                svgContainer.innerHTML = `
          <div class="error-message">
            <strong>Failed to render TikZ diagram</strong><br>
            <div style="margin-top: 8px;">
              Common solutions:
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Check for syntax errors</li>
                <li>Simplify complex diagrams</li>
                <li>Try smaller diagrams first</li>
              </ul>
            </div>
          </div>`;
                document.body.removeChild(iframe);
                removePlaceholders();
            }
        };

        checkForSVG();
    } catch (e) {
        console.error('TikZ rendering error:', e);
        svgContainer.innerHTML = `
      <div class="error-message">
        <strong>Rendering Error:</strong> ${e.message}
        <div style="margin-top: 8px;">Try simplifying your TikZ code or check for syntax errors.</div>
      </div>`;
        removePlaceholders();
    }
}