// Editor configuration and setup
import { editorConfigService } from './services/editorConfigService.js';

/**
 * Initializes and configures the Monaco editor instance for TikZ editing.
 *
 * @async
 * @param {string} containerId - The ID of the DOM container where the editor should be mounted.
 * @param {string} initialValue - The initial content to load into the editor.
 * @returns {Promise<import('monaco-editor').editor.IStandaloneCodeEditor>}
 *   A promise that resolves with the created Monaco editor instance.
 *
 * @example
 * const editor = await setupEditor("editor-container", "\\begin{tikzpicture} ...");
 */
export async function setupEditor(containerId, initialValue) {
    // Load Monaco from CDN
    const monaco = await loadMonacoEditor();

    // Set Monaco instance in the configuration service
    editorConfigService.setMonaco(monaco);

    // Coonfigure TikZ language, theme, and snippets
    editorConfigService.configureTikZLanguage();

    // Create editor instance using   service
    const editor = editorConfigService.createEditor(containerId, initialValue);

    // Expose editor globally so the renderer save handler can access it
    window.editorInstance = editor;

    // Expose monaco 
    window.monaco = monaco;

    return editor;
}

/**
 * Dynamically loads the Monaco Editor
 *
 * @private
 * @async
 * @returns {Promise<typeof import('monaco-editor')>}
 *   A promise that resolves with the Monaco API once loaded.
 */
async function loadMonacoEditor() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs/loader.min.js';
        script.onload = () => {
            window.require.config({
                paths: {
                    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs'
                }
            });
            window.require(['vs/editor/editor.main'], () => {
                resolve(window.monaco);
            });
        };
        document.head.appendChild(script);
    });
}