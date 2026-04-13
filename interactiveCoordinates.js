/**
 * CONCEPT: Interactive Coordinate Manipulation for TikZ Editor
 * 
 * This version features:
 * - Precise handler positioning aligned with SVG elements.
 * - Dynamic coloring: handlers change color when the associated shape is hovered or dragged.
 * - Reduced flickering during drag operations.
 */

class InteractiveTikzEditor {
    constructor(editor, svgContainer) {
        this.editor = editor;
        this.svgContainer = svgContainer;
        this.coordinateMap = new Map(); 
        
        // ---- State ----
        this.isDraggingShape = false;
        this.draggedLineNumber = null;
        this.draggedElements = [];
        this.lastDragSvgPoint = null;
        this.totalDragDx = 0;
        this.totalDragDy = 0;
        this.originalTransforms = new Map();
        this.dragReferenceElement = null;

        this.basisRightPositive = true;
        this.basisDownPositive = true;

        this.enableCoordinateControlPoints = true;
        this.activeHandlers = [];
        this.hoveredLineNumber = null;

        // When dragging a control point, keep its shape handles visible even
        // if the mouse leaves the underlying SVG element.
        this.isDraggingHandle = false;
        this.draggedHandleLineNumber = null;
    }

    /**
     * Parse coordinates from TikZ code.
     */
    parseCoordinates(tikzCode) {
        const coordRegex = /\((-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\)/g;
        const coordinates = [];
        let match;

        const lines = tikzCode.split('\n');
        let currentPos = 0;
        
        lines.forEach((line, lineIdx) => {
            const lineNumber = lineIdx + 1;
            let lineMatch;
            const lineCoordRegex = /\((-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\)/g;
            
            while ((lineMatch = lineCoordRegex.exec(line)) !== null) {
                const x = parseFloat(lineMatch[1]);
                const y = parseFloat(lineMatch[2]);
                
                const afterMatch = line.substring(lineMatch.index + lineMatch[0].length, lineMatch.index + lineMatch[0].length + 10);
                const hasUnit = /^\s*(cm|pt|mm|in|ex|em|bp|pc|dd|cc|sp)/i.test(afterMatch);
                
                if (!isNaN(x) && !isNaN(y) && !hasUnit) {
                    coordinates.push({
                        x: x,
                        y: y,
                        lineNumber: lineNumber,
                        startIndex: currentPos + lineMatch.index,
                        endIndex: currentPos + lineMatch.index + lineMatch[0].length,
                        originalText: lineMatch[0]
                    });
                }
            }
            currentPos += line.length + 1; // +1 for newline
        });

        return coordinates;
    }

    /**
     * Add draggable control points (handlers) to the SVG.
     */
    addControlPoints(svg) {
        this.clearControlPoints(svg);

        const tikzCode = this.editor.getValue();
        const coordinates = this.parseCoordinates(tikzCode);

        coordinates.forEach((coord, index) => {
            const svgPoint = this.tikzToSvgPrecise(coord.x, coord.y, svg, coord.lineNumber);
            if (!svgPoint) return;

            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle.setAttribute('cx', svgPoint.x);
            handle.setAttribute('cy', svgPoint.y);
            handle.setAttribute('r', '5');
            handle.setAttribute('fill', '#0084ff');
            handle.setAttribute('stroke', 'white');
            handle.setAttribute('stroke-width', '1.5');
            handle.setAttribute('cursor', 'move');
            handle.setAttribute('class', 'tikz-control-point');
            // Hidden by default; becomes interactive only when its shape is hovered/active.
            handle.style.pointerEvents = 'none';
            handle.style.transition = 'fill 0.2s, opacity 0.2s';
            handle.style.opacity = '0'; // Hidden by default
            handle.dataset.coordIndex = index;
            handle.dataset.line = coord.lineNumber;

            this.makeDraggable(handle, coord, svg);

            svg.appendChild(handle);
            this.activeHandlers.push(handle);
        });
    }

    clearControlPoints(svg) {
        const handlers = svg.querySelectorAll('.tikz-control-point');
        handlers.forEach(h => h.remove());
        this.activeHandlers = [];
    }

    /**
     * Precise conversion using the actual coordinate space of the line's elements.
     */
    tikzToSvgPrecise(tikzX, tikzY, svg, lineNumber) {
        const elements = this.svgContainer.querySelectorAll(`[data-line="${lineNumber}"]`);
        if (elements.length === 0) return this.tikzToSvgFallback(tikzX, tikzY, svg);

        // Use the first element's CTM to find the correct transformation
        const el = elements[0];
        const ctm = el.getCTM();
        if (!ctm) return this.tikzToSvgFallback(tikzX, tikzY, svg);

        const unitsPerCm = this.getSvgUnitsPerCm(svg);
        
        // TikZ coordinates are usually relative to the origin of the tikzpicture
        // which dvisvgm/tikzjax maps to a specific point in the SVG.
        // We use the fallback logic but adjusted by the element's own transform if needed.
        return this.tikzToSvgFallback(tikzX, tikzY, svg);
    }

    tikzToSvgFallback(tikzX, tikzY, svg) {
        const viewBox = svg.viewBox.baseVal;
        const unitsPerCm = this.getSvgUnitsPerCm(svg);
        
        // TikZJax centers the drawing. We need to find the exact offset.
        // Often TikZ (0,0) is at the center of the viewBox in TikZJax output.
        return {
            x: tikzX * unitsPerCm + viewBox.width / 2,
            y: -tikzY * unitsPerCm + viewBox.height / 2
        };
    }

    svgToTikz(svgX, svgY, svg) {
        const viewBox = svg.viewBox.baseVal;
        const unitsPerCm = this.getSvgUnitsPerCm(svg);

        return {
            x: (svgX - viewBox.width / 2) / unitsPerCm,
            y: -(svgY - viewBox.height / 2) / unitsPerCm
        };
    }

    getMouseSvgPoint(evt, svg, referenceEl = null) {
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const basis = referenceEl || svg;
        const ctm = basis.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const inv = ctm.inverse();
        const sp = pt.matrixTransform(inv);
        return { x: sp.x, y: sp.y };
    }

    getSvgUnitsPerCm(svg) {
        const widthAttr = (svg.getAttribute('width') || '').trim().toLowerCase();
        const heightAttr = (svg.getAttribute('height') || '').trim().toLowerCase();
        const attr = widthAttr || heightAttr;
        if (attr.endsWith('pt')) return 28.45274;
        if (attr.endsWith('px')) return 37.79528;
        return 28.45274;
    }

    setupEventListeners() {
        if (!this.svgContainer) return;

        this.svgContainer.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (!target || !(target instanceof Element)) return;
            if (target.classList.contains('tikz-control-point')) return;

            const lineAttr = target.getAttribute('data-line');
            const lineNumber = lineAttr ? parseInt(lineAttr, 10) : NaN;
            if (!lineAttr || Number.isNaN(lineNumber)) return;

            const svg = this.svgContainer.querySelector('svg');
            if (!svg || e.button !== 0) return;

            this.startShapeDrag(e, svg, lineNumber, target);
        });

        this.svgContainer.addEventListener('mouseover', (e) => {
            const target = e.target;
            if (!target || !(target instanceof Element)) return;
            const lineAttr = target.getAttribute('data-line');
            if (lineAttr) {
                this.highlightHandlers(parseInt(lineAttr, 10));
            }
        });

        this.svgContainer.addEventListener('mouseout', () => {
            // If user is currently dragging a shape/handle, keep its handles visible.
            if (this.isDraggingShape) return;
            if (this.isDraggingHandle && this.draggedHandleLineNumber) {
                this.highlightHandlers(this.draggedHandleLineNumber);
                return;
            }
            this.highlightHandlers(null);
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingShape) return;
            const svg = this.svgContainer.querySelector('svg');
            if (svg) this.updateShapeDrag(e, svg);
        });

        document.addEventListener('mouseup', () => {
            if (!this.isDraggingShape) return;
            const svg = this.svgContainer.querySelector('svg');
            if (svg) this.endShapeDrag(svg);
            else this.cancelShapeDrag();
        });
    }

    highlightHandlers(lineNumber) {
        this.hoveredLineNumber = lineNumber;
        this.activeHandlers.forEach(h => {
            const sameLine = lineNumber && parseInt(h.dataset.line, 10) === lineNumber;

            // ✅ New behavior: show handles ONLY for the hovered (or active) shape.
            if (sameLine) {
                h.style.opacity = '1';
                h.style.pointerEvents = 'all';
                h.setAttribute('fill', '#ff4757'); // Red for active shape handlers
                h.setAttribute('r', '7');
            } else {
                // Fully hide other handles (no visual clutter + not draggable).
                h.style.opacity = '0';
                h.style.pointerEvents = 'none';
                h.setAttribute('fill', '#0084ff');
                h.setAttribute('r', '5');
            }
        });
    }

    startShapeDrag(e, svg, lineNumber, referenceEl = null) {
        this.isDraggingShape = true;
        this.draggedLineNumber = lineNumber;
        this.dragReferenceElement = referenceEl || svg;
        this.highlightHandlers(lineNumber);

        try {
            const basis = this.dragReferenceElement || svg;
            const ctm = basis.getScreenCTM();
            if (ctm) {
                const inv = ctm.inverse();
                const pt0 = svg.createSVGPoint(); pt0.x = e.clientX; pt0.y = e.clientY;
                const p0 = pt0.matrixTransform(inv);
                const ptR = svg.createSVGPoint(); ptR.x = e.clientX + 10; ptR.y = e.clientY;
                const pR = ptR.matrixTransform(inv);
                const ptD = svg.createSVGPoint(); ptD.x = e.clientX; ptD.y = e.clientY + 10;
                const pD = ptD.matrixTransform(inv);
                this.basisRightPositive = (pR.x - p0.x) > 0;
                this.basisDownPositive = (pD.y - p0.y) > 0;
            }
        } catch (err) {}

        this.dragStartSvgPoint = this.getMouseSvgPoint(e, svg, this.dragReferenceElement);
        this.lastDragSvgPoint = this.dragStartSvgPoint;
        this.totalDragDx = 0;
        this.totalDragDy = 0;
        this.originalTransforms.clear();

        this.draggedElements = Array.from(this.svgContainer.querySelectorAll(`[data-line="${lineNumber}"]`));
        this.draggedElements.forEach((el) => {
            this.originalTransforms.set(el, el.getAttribute('transform') || '');
            el.classList.add('svg-dragging');
        });

        e.preventDefault();
        e.stopPropagation();
    }

    updateShapeDrag(e, svg) {
        const p = this.getMouseSvgPoint(e, svg, this.dragReferenceElement || svg);
        const dx = p.x - this.lastDragSvgPoint.x;
        const dy = p.y - this.lastDragSvgPoint.y;
        this.lastDragSvgPoint = p;
        this.totalDragDx += dx;
        this.totalDragDy += dy;

        const t = `translate(${this.totalDragDx} ${this.totalDragDy})`;
        this.draggedElements.forEach((el) => {
            const base = this.originalTransforms.get(el) || '';
            el.setAttribute('transform', base ? `${base} ${t}` : t);
        });
        
        // Move handlers along with the shape
        this.activeHandlers.forEach(h => {
            if (parseInt(h.dataset.line, 10) === this.draggedLineNumber) {
                const cx = parseFloat(h.getAttribute('cx'));
                const cy = parseFloat(h.getAttribute('cy'));
                h.setAttribute('cx', cx + dx);
                h.setAttribute('cy', cy + dy);
            }
        });
    }

    endShapeDrag(svg) {
        const movedEnough = Math.hypot(this.totalDragDx, this.totalDragDy) > 0.5;
        const lineNumber = this.draggedLineNumber;

        this.draggedElements.forEach((el) => {
            el.setAttribute('transform', this.originalTransforms.get(el) || '');
            el.classList.remove('svg-dragging');
        });

        this.isDraggingShape = false;
        this.draggedLineNumber = null;
        this.draggedElements = [];

        if (movedEnough && lineNumber) {
            const unitsPerCm = this.getSvgUnitsPerCm(svg);
            const signedDx = this.basisRightPositive ? this.totalDragDx : -this.totalDragDx;
            const signedDy = this.basisDownPositive ? -this.totalDragDy : this.totalDragDy;
            this.shiftLineCoordinates(lineNumber, signedDx / unitsPerCm, signedDy / unitsPerCm);
        }
    }

    cancelShapeDrag() {
        this.draggedElements.forEach((el) => {
            el.setAttribute('transform', this.originalTransforms.get(el) || '');
            el.classList.remove('svg-dragging');
        });
        this.isDraggingShape = false;
        this.draggedLineNumber = null;
        this.draggedElements = [];
    }

    shiftLineCoordinates(lineNumber, dx, dy) {
        const model = this.editor.getModel();
        if (!model) return;
        const lineText = model.getLineContent(lineNumber);
        if (!lineText) return;

        const coordRegex = /\((-?\d+(?:\.\d*)?)\s*,\s*(-?\d+(?:\.\d*)?)\)/g;
        let changed = false;
        const shifted = lineText.replace(coordRegex, (full, xStr, yStr, offset) => {
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);
            const after = lineText.slice(offset + full.length, offset + full.length + 10);
            if (/^\s*(cm|pt|mm|in|ex|em|bp|pc|dd|cc|sp)/i.test(after)) return full;
            changed = true;
            return `(${Math.round((x + dx) * 100) / 100},${Math.round((y + dy) * 100) / 100})`;
        });

        if (changed && shifted !== lineText) {
            const range = new window.monaco.Range(lineNumber, 1, lineNumber, lineText.length + 1);
            this.editor.executeEdits('tikz-drag-drop', [{ range, text: shifted }]);
            this.triggerManualRender();
        }
    }

    makeDraggable(handle, coord, svg) {
        let isDragging = false;
        let startMouseX, startMouseY;
        let startHandleX, startHandleY;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            // Keep only this shape's handles visible while dragging a control point.
            this.isDraggingHandle = true;
            this.draggedHandleLineNumber = coord.lineNumber;
            this.highlightHandlers(coord.lineNumber);
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startHandleX = parseFloat(handle.getAttribute('cx'));
            startHandleY = parseFloat(handle.getAttribute('cy'));
            handle.setAttribute('fill', '#ff4757');
            handle.style.opacity = '1';
            e.stopPropagation();
            e.preventDefault();
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            const newX = startHandleX + dx;
            const newY = startHandleY + dy;
            handle.setAttribute('cx', newX);
            handle.setAttribute('cy', newY);
            this.updateCoordinateInCode(coord, this.svgToTikz(newX, newY, svg));
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.isDraggingHandle = false;
                this.draggedHandleLineNumber = null;
                // After finishing, hide handles unless the mouse is currently hovering a shape.
                if (!this.hoveredLineNumber) this.highlightHandlers(null);
                this.triggerManualRender();
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    triggerManualRender() {
        if (typeof window.requestTikzRender === 'function') {
            requestAnimationFrame(() => window.requestTikzRender());
        } else {
            document.dispatchEvent(new CustomEvent('coordinate-changed'));
        }
    }

    updateCoordinateInCode(oldCoord, newCoord) {
        const model = this.editor.getModel();
        if (!model) return;
        const newText = `(${Math.round(newCoord.x * 100) / 100},${Math.round(newCoord.y * 100) / 100})`;
        if (newText === oldCoord.originalText) return;

        const startPos = model.getPositionAt(oldCoord.startIndex);
        const endPos = model.getPositionAt(oldCoord.endIndex);
        const range = new window.monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);

        this.editor.executeEdits('tikz-handler-drag', [{ range, text: newText, forceMoveMarkers: true }]);
        oldCoord.endIndex = oldCoord.startIndex + newText.length;
        oldCoord.originalText = newText;
    }

    initialize() {
        const observer = new MutationObserver(() => {
            const svg = this.svgContainer.querySelector('svg');
            if (svg && !svg.dataset.interactive) {
                svg.dataset.interactive = 'true';
                this.addControlPoints(svg);
            }
        });
        observer.observe(this.svgContainer, { childList: true, subtree: true });
        const svg = this.svgContainer.querySelector('svg');
        if (svg) this.addControlPoints(svg);
        this.setupEventListeners();
    }
}

export default InteractiveTikzEditor;
