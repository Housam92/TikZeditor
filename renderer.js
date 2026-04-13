// Main entry point for the TikZ editor
import { setupEditor } from './editor.js';
import { setupPreview, updatePreview } from './preview.js';
import { setupExportButtons } from './export.js';
import { tikzProcessingService } from './services/tikzProcessingService.js';
import InteractiveTikzEditor from './interactiveCoordinates.js';
/**
 * Initializes the TikZ editor application.
 * Sets up the editor, preview, export buttons, snippet insertion, and menu interactions.
 * Also handles window resizing and manual render button.
 */
async function initializeApp() {
  try {
    // Setup editor with initial empty TikZ example
    const editor = await setupEditor(
      'editor',
      '\\begin{tikzpicture}\n\n\\end{tikzpicture}'
    );

    // Make editor globally accessible
    window.editorInstance = editor;

    // Reliable direct render hook for other modules (e.g., drag & drop).
    // This is more robust than relying only on a custom DOM event.
    window.requestTikzRender = () => {
      try {
        updatePreview(editor, 'tikz-output');
      } catch (e) {
        console.error('requestTikzRender failed:', e);
      }
    };

    // ✅ Get checkbox and button references
    const autoRenderCheckbox = document.getElementById('autoRender');
    const manualRenderButton = document.getElementById('manualRender');

    if (!autoRenderCheckbox || !manualRenderButton) {
      console.error("⚠️ Elements 'autoRender' or 'manualRender' not found.");
    }

    // ✅ Setup auto-render with debouncing
    let previewTimeout;
    editor.onDidChangeModelContent(() => {
      if (autoRenderCheckbox && autoRenderCheckbox.checked) {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          updatePreview(editor, 'tikz-output');
        }, 500);
      }
    });

    //  toggle manual render button based on checkbox
    if (autoRenderCheckbox && manualRenderButton) {
      autoRenderCheckbox.addEventListener('change', () => {
        manualRenderButton.disabled = autoRenderCheckbox.checked;
      });

      //  manual render button click handler
      manualRenderButton.addEventListener('click', () => {
        updatePreview(editor, 'tikz-output');
      });
    }

    // TikZz snippets dropdown handler
    const snippetSelect = document.getElementById('tikz-snippets');
    if (snippetSelect) {
      snippetSelect.addEventListener('change', (e) => {
        const snippet = e.target.value;
        if (snippet && editor) {
          const currentCode = editor.getValue();

          const beginTag = '\\begin{tikzpicture}';
          const endTag = '\\end{tikzpicture}';
          const beginIndex = currentCode.indexOf(beginTag);
          const endIndex = currentCode.indexOf(endTag);

          if (beginIndex !== -1 && endIndex !== -1) {
            const insertPos = beginIndex + beginTag.length;
            const before = currentCode.slice(0, insertPos);
            const middle = '\n  ' + snippet;
            const after = currentCode.slice(insertPos);
            editor.setValue(before + middle + after);
          } else {
            editor.setValue(currentCode + '\n' + snippet);
          }

          // update preview after snippet insertion
          updatePreview(editor, 'tikz-output');
          snippetSelect.selectedIndex = 0;
        }
      });
    }

    // handle "Save as LaTeX..." menu action
    window.electronAPI.ipc.on('request-save-latex', () => {
      const tikzCode = editor.getValue() || '';
      if (!tikzCode) return;

      const latex = `
\\documentclass{standalone}
\\usepackage{tikz}
\\begin{document}
${tikzCode}
\\end{document}
      `.trim();

      window.electronAPI.ipc.send('reply-save-latex', latex);
    });

    // handle "Open LaTeX File..." menu action
    window.electronAPI.ipc.on('request-load-latex', () => {
      window.electronAPI.ipc.send('request-load-latex');
    });

    window.electronAPI.ipc.on('reply-load-latex', (event, content) => {
      const extractedTikz = tikzProcessingService.extractTikzContent(content);
      editor.setValue(extractedTikz);
      updatePreview(editor, 'tikz-output');
    });

    // setup preview (without auto-rendering - we handle that above)
    setupPreview(editor, 'tikz-output');
// Setup preview (without auto-rendering - we handle that above)
    setupPreview(editor, 'tikz-output');

    // Re-render when interactive drag/drop updates coordinates
    document.addEventListener('coordinate-changed', () => {
      updatePreview(editor, 'tikz-output');
    });

    //  Setup interactive coordinate manipulation
    const interactiveEditor = new InteractiveTikzEditor(
      editor,
      document.getElementById('tikz-output')
    );
    interactiveEditor.initialize();

    // Seetup export buttons (SVG / PDF)
    setupExportButtons();
    // setup export buttons (SVG / PDF)
    setupExportButtons();

    // handle window resize to adjust editor layout
    window.addEventListener('resize', () => editor.layout());


    // Drag & Drop support: load .tex / .tikz files by dropping into the editor panel
    const editorHost = document.getElementById('editor');
    if (editorHost) {
      const dragOverClass = 'editor-drag-over';

      const showDragOverlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorHost.classList.add(dragOverClass);
      };

      const hideDragOverlay = (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorHost.classList.remove(dragOverClass);
      };

      const handleFileDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        editorHost.classList.remove(dragOverClass);

        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) {
          return;
        }

        const file = files[0];
        const fileName = file.name || '';

        // Only accept common LaTeX / TikZ source files
        const isTexLike = /\.(tex|tikz|txt)$/i.test(fileName);
        if (!isTexLike) {
          console.warn('Dropped file is not a LaTeX/TikZ source file:', fileName);
          return;
        }

        try {
          const text = await file.text();
          if (text && text.trim()) {
            editor.setValue(text);
            updatePreview(editor, 'tikz-output');
          }
        } catch (readErr) {
          console.error('Failed to read dropped file:', readErr);
        }
      };

      // Prevent default browser behavior for drag/drop over the window
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        window.addEventListener(eventName, (e) => {
          if (e.target === editorHost || editorHost.contains(e.target)) {
            // Let the editor-specific handlers manage styling
            return;
          }
          if (eventName === 'dragover' || eventName === 'dragenter') {
            e.preventDefault();
          }
        });
      });

      editorHost.addEventListener('dragenter', showDragOverlay);
      editorHost.addEventListener('dragover', showDragOverlay);
      editorHost.addEventListener('dragleave', hideDragOverlay);
      editorHost.addEventListener('drop', handleFileDrop);
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

/**
 * setup resizer between: editor and preview panels.
 * allows horizontal resizing by dragging the resizer element.
 */
const resizer = document.getElementById('resizer');
const leftSide = document.getElementById('editor');
const rightSide = document.getElementById('preview');
const container = document.getElementById('container');

let isResizing = false;

resizer.addEventListener('mousedown', () => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  const containerOffsetLeft = container.offsetLeft;
  const pointerX = e.clientX - containerOffsetLeft;
  const containerWidth = container.offsetWidth;

  const leftWidthPct = (pointerX / containerWidth) * 100;
  const rightWidthPct = 100 - leftWidthPct - (resizer.offsetWidth / containerWidth * 100);

  if (leftWidthPct < 10 || rightWidthPct < 10) return;

  leftSide.style.width = `${leftWidthPct}%`;
  rightSide.style.width = `${rightWidthPct}%`;
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = 'default';
});

// start the application
initializeApp();