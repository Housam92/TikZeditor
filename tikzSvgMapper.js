/**
 * Maps TikZ code lines to SVG elements by extracting line numbers from SVG group IDs.
 * This version uses the special comments added during preprocessing for 100% accurate mapping.
 *
 * @param {string} tikzCode The original TikZ code as a string (for reference).
 * @param {string} svgString The SVG output from tikzjax as a string.
 * @returns {string} The modified SVG string with data attributes for event handling.
 */
export function mapTikzToSvg(tikzCode, svgString, config = {
  strictMapping: false,
  visualFeedback: true
}) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.querySelector('svg');

  if (!svgElement) {
    return svgString;
  }

  // Add style block for simple, clear hover effect
  const styleElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = `
    /* Invisible hit-area used to make dragging easier */
    .tikz-hit-area {
      stroke: transparent !important;
      fill: none !important;
    }

    [data-line]:hover:not(.tikz-hit-area) {
      stroke: #00aaff !important;
      stroke-width: 1px !important;
      stroke-opacity: 1 !important;
    }
    
    /* Subtle hover for text elements to keep text visible */
    text[data-line]:hover:not(.tikz-hit-area) {
      stroke: #00aaff !important;
      stroke-width: 1px !important;
      stroke-opacity: 0.7 !important;
    }
    
    /* Simple hover for fill elements */
    [data-line]:hover:not(.tikz-hit-area)[fill] {
      fill-opacity: 0.8 !important;
      stroke: #00aaff !important;
      stroke-width: 2px !important;
    }
    
    /* Focus states */
    [data-line]:focus {
      outline: 2px solid #00aaff !important;
      outline-offset: 1px !important;
    }
    
    [data-line].no-mapping {
      stroke: #ff5555 !important;
      opacity: 0.7 !important;
      cursor: not-allowed !important;
    }
    
    /* Simple visual feedback for mapped elements */
    [data-line] {
      cursor: pointer !important;
      pointer-events: visiblePainted !important;
    }
    
    /* Ensure all mapped elements are clickable regardless of type */
    [data-line] path,
    [data-line] line,
    [data-line] rect,
    [data-line] circle,
    [data-line] ellipse,
    [data-line] polygon,
    [data-line] polyline,
    [data-line] text {
      pointer-events: visiblePainted !important;
    }
    
    /* Highlighted elements */
    [data-line].highlighted {
      stroke: #00aaff !important;
      stroke-width: 2px !important;
      stroke-opacity: 1 !important;
      fill: none !important;
    }
    
    [data-line].highlighted[fill] {
      stroke: #00aaff !important;
      stroke-width: 2px !important;
      fill-opacity: 0.1 !important;
    }
    
    /* Subtle highlight for text elements */
    text[data-line].highlighted {
      stroke: #00aaff !important;
      stroke-width: 1px !important;
      stroke-opacity: 1 !important;
    }
    
    /* Dark mode adjustments */
    @media (prefers-color-scheme: dark) {
      [data-line]:hover {
        stroke: #00c6ff !important;
      }
      
      text[data-line]:hover {
        stroke: #00c6ff !important;
        stroke-opacity: 0.7 !important;
      }
      
      [data-line].highlighted {
        stroke: #00aaff !important;
        fill: none !important;
      }
      
      [data-line].highlighted[fill] {
        fill-opacity: 0.1 !important;
      }
      
      text[data-line].highlighted {
        stroke: #00c6ff !important;
      }
    }
  `;
  svgElement.prepend(styleElement);

  // Use provided config or defaults
  config = {
    strictMapping: config.strictMapping || false,
    visualFeedback: config.visualFeedback !== false
  };

  // Find all SVG groups that have IDs starting with "line" 
  const svgGroups = svgElement.querySelectorAll('g[id^="line"]');
  
  svgGroups.forEach(group => {
    const id = group.getAttribute('id');
    const lineNumber = parseInt(id.replace('line', ''), 10);
    
    if (!isNaN(lineNumber)) {
      // Find all drawing elements within this group (including text elements)
      const drawingElements = group.querySelectorAll('path, line, rect, circle, ellipse, polygon, polyline, text');
      
      drawingElements.forEach(element => {
        // Set data-line attribute for mapping
        element.setAttribute('data-line', lineNumber);
        element.setAttribute('style', 'cursor: pointer; pointer-events: all;');

        // ---- Make dragging easier (bigger hit-area) ----
        // Some SVG strokes are very thin, so grabbing them is hard.
        // We create an invisible clone with a thick transparent stroke so
        // the user can click/drag "on the border" easily.
        // Skip text (it already has a big clickable area) and skip if already created.
        const tag = element.tagName?.toLowerCase?.() || '';
        const canClone = tag !== 'text';
        if (canClone && !element.classList.contains('hit-original')) {
          element.classList.add('hit-original');
          const hit = element.cloneNode(true);
          hit.classList.add('tikz-hit-area');
          hit.setAttribute('data-line', lineNumber);

          // Make it invisible but clickable
          hit.setAttribute('fill', 'none');
          hit.setAttribute('stroke', 'transparent');

          // Wider stroke = easier to grab
          // (12 is a good default, change if you want it larger)
          const existingStrokeWidth = hit.getAttribute('stroke-width');
          hit.setAttribute('stroke-width', existingStrokeWidth ? Math.max(parseFloat(existingStrokeWidth) * 4, 12) : 12);
          hit.setAttribute('pointer-events', 'stroke');

          // Put hit-area BEFORE the visible element
          element.parentNode?.insertBefore(hit, element);
        }
        
        //  complex cases, apply strict mapping rules if enabled
        if (config.strictMapping) {
          //   check if this is a complex command by looking at the original TikZ line
          const allLines = tikzCode.split('\n');
          if (lineNumber <= allLines.length) {
            const originalLine = allLines[lineNumber - 1];
            const isComplexCommand = 
              /\\path.*?\(.*?\)/.test(originalLine) || 
              /\\draw.*?\(.*?\)/.test(originalLine) ||
              /\\foreach/.test(originalLine) ||
              /\\node.*?\(.*?\)/.test(originalLine) ||
              /\\graph/.test(originalLine) ||
              originalLine.includes(';') && originalLine.split(';').length > 2;
            
            if (isComplexCommand) {
              element.removeAttribute('data-line');
              element.classList.add('no-mapping');
            }
          }
        }
      });
    }
  });

  // Return the modified SVG string.
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgDoc);
}
