/**
 * SVG-Monaco Interaction Service
 * 
 * Handles bidirectional mapping between SVG elements and Monaco editor lines
 * Provides clean API for highlighting, navigation, and event handling
 * 
 * @module services/svgMonacoInteractionService
 */

export class SvgMonacoInteractionService {
  /**
   * Create a new SVG-Monaco interaction service
   * @param {Object} config - Configuration options
   * @param {boolean} config.strictMapping - Enable strict 1:1 mapping
   * @param {boolean} config.visualFeedback - Enable visual feedback
   */
  constructor(config = {}) {
    this.config = {
      strictMapping: config.strictMapping || false,
      visualFeedback: config.visualFeedback !== false
    };
    
    this.editor = null;
    this.svgContainer = null;
    this.currentHighlights = new Set();
    this.lastHoveredElement = null;
    this.lastHoverPoint = null;
  }

  /**
   * Initialize the service with editor and SVG container references
   * @param {Object} editor - Monaco editor instance
   * @param {HTMLElement} svgContainer - SVG container element
   */
  initialize(editor, svgContainer) {
    this.editor = editor;
    this.svgContainer = svgContainer;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for SVG element interactions
   * @private
   */
  setupEventListeners() {
    if (!this.svgContainer) return;

    // We no longer clone the container to avoid clearing interactive handlers
    // instead we just ensure listeners are added once if possible or handle them carefully.
    
    // Add delegated click handler
    this.svgContainer.addEventListener('click', (event) => {
      this.handleSvgClick(event);
    });

    // Add mousemove handler for hover effects (more reliable for overlapping elements)
    if (this.config.visualFeedback) {
      this.svgContainer.addEventListener('mousemove', (event) => {
        this.handleSvgHoverMove(event);
      });

      this.svgContainer.addEventListener('mouseleave', () => {
        this.clearAllHovers();
      });
    }
  }

  /**
   * Handle SVG element click events
   * @param {Event} event - Click event
   * @private
   */
  handleSvgClick(event) {
    // Get all elements at the click point, not just the top one
    const elementsAtPoint = this.getElementsAtPoint(event.clientX, event.clientY);
    const targetElement = this.findBestTargetElement(elementsAtPoint);
    
    if (!targetElement || !this.editor) return;

    const lineNumber = parseInt(targetElement.getAttribute('data-line'), 10);
    if (isNaN(lineNumber)) return;

    console.log(`Navigating to line ${lineNumber} from SVG click`);
    this.highlightSvgElements(lineNumber);
    this.navigateToLine(lineNumber);
  }

  /**
   * Handle SVG element hover movement
   * @param {Event} event - Mousemove event
   * @private
   */
  handleSvgHoverMove(event) {
    const currentPoint = `${event.clientX},${event.clientY}`;
    
    // Throttle hover updates to improve performance
    if (this.lastHoverPoint === currentPoint) {
      return;
    }
    this.lastHoverPoint = currentPoint;
    
    // Get all elements at the current point and find the best target
    const elementsAtPoint = this.getElementsAtPoint(event.clientX, event.clientY);
    const targetElement = this.findBestTargetElement(elementsAtPoint);
    
    // Clear previous hover states
    this.clearAllHovers();
    
    // Apply hover to the target element
    if (targetElement) {
      targetElement.classList.add('svg-hover');
      this.lastHoveredElement = targetElement;
    }
  }

  /**
   * Clear all hover states from SVG elements
   * @private
   */
  clearAllHovers() {
    if (this.svgContainer) {
      this.svgContainer.querySelectorAll('.svg-hover').forEach(element => {
        element.classList.remove('svg-hover');
      });
    }
    this.lastHoveredElement = null;
  }

  /**
   * Navigate to a specific line in the Monaco editor
   * @param {number} lineNumber - Line number to navigate to
   */
  navigateToLine(lineNumber) {
    if (!this.editor || !this.editor.revealLineInCenter) return;

    try {
      this.editor.revealLineInCenter(lineNumber);
      // Set selection to the start of the line instead of the end
      this.editor.setSelection(new window.monaco.Range(lineNumber, 1, lineNumber, 1));
      this.editor.focus();
    } catch (error) {
      console.warn('Failed to navigate to line:', lineNumber, error);
    }
  }

  /**
   * Highlight SVG elements corresponding to a specific line number
   * @param {number} lineNumber - Line number to highlight
   */
  highlightSvgElements(lineNumber) {
    if (!this.svgContainer) return;

    // Clear previous highlights
    this.clearHighlights();

    // Find and highlight elements for this line
    const elements = this.svgContainer.querySelectorAll(`[data-line="${lineNumber}"]`);
    elements.forEach(element => {
      element.classList.add('svg-highlight');
      this.currentHighlights.add(element);
    });
  }

  /**
   * Clear all SVG element highlights
   */
  clearHighlights() {
    this.currentHighlights.forEach(element => {
      element.classList.remove('svg-highlight');
    });
    this.currentHighlights.clear();
  }

  /**
   * Handle editor line highlight events (from Monaco to SVG)
   * @param {number} lineNumber - Line number that was highlighted in editor
   */
  handleEditorLineHighlight(lineNumber) {
    this.highlightSvgElements(lineNumber);
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Re-setup listeners if visual feedback changed
    if (newConfig.visualFeedback !== undefined) {
      this.setupEventListeners();
    }
  }

  /**
   * Get all SVG elements at a specific point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array} Array of SVG elements at the point
   * @private
   */
  getElementsAtPoint(x, y) {
    if (!this.svgContainer) return [];
    
    const elements = [];
    const svgElement = this.svgContainer.querySelector('svg');
    if (!svgElement) return [];
    
    // Get the SVG's position relative to the viewport
    const svgRect = svgElement.getBoundingClientRect();
    const svgX = x - svgRect.left;
    const svgY = y - svgRect.top;
    
    // Use document.elementsFromPoint to get all elements at the coordinates
    const allElements = document.elementsFromPoint(x, y);
    
    // Filter for SVG elements with data-line attributes that are within our SVG container
    return allElements.filter(element => {
      return element.hasAttribute('data-line') && 
             this.svgContainer.contains(element);
    });
  }

  /**
   * Find the best target element from a list of overlapping elements
   * Prioritizes smaller elements (likely inner circles) over larger ones
   * @param {Array} elements - Array of SVG elements
   * @returns {SVGElement|null} The best target element
   * @private
   */
  findBestTargetElement(elements) {
    if (elements.length === 0) return null;
    if (elements.length === 1) return elements[0];
    
    // Sort elements by size (smaller elements first) to prioritize inner circles
    return elements.sort((a, b) => {
      const aSize = this.getElementSize(a);
      const bSize = this.getElementSize(b);
      return aSize - bSize;
    })[0];
  }

  /**
   * Calculate the approximate size of an SVG element
   * @param {SVGElement} element - SVG element
   * @returns {number} Approximate size (area or dimension)
   * @private
   */
  getElementSize(element) {
    const bbox = element.getBBox();
    return bbox.width * bbox.height;
  }

  /**
   * Clean up and remove event listeners
   */
  destroy() {
    if (this.svgContainer) {
      const newContainer = this.svgContainer.cloneNode(false);
      newContainer.innerHTML = this.svgContainer.innerHTML;
      this.svgContainer.parentNode.replaceChild(newContainer, this.svgContainer);
    }
    this.clearHighlights();
    this.editor = null;
    this.svgContainer = null;
    this.currentHighlights.clear();
  }
}

// Export singleton instance for easy access
export const svgMonacoInteractionService = new SvgMonacoInteractionService();

export default svgMonacoInteractionService;
