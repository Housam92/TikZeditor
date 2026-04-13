// Export functionality for SVG and PDF
const jsPDF = window.jspdf.jsPDF;

/**
 * Sets up click event listeners for export buttons.
 * Connects HTML buttons with IDs 'export-svg' and 'export-pdf'
 * to their corresponding export functions.
 */
export function setupExportButtons() {
    document.getElementById('export-svg')?.addEventListener('click', exportSVG);
    document.getElementById('export-pdf')?.addEventListener('click', exportPDF);
}

/**
 * Exports the SVG diagram as a standalone .svg file.
 * Serializes the SVG content from the container with ID 'tikz-svg-container',
 * creates a downloadable Blob, and triggers a download.
 */
function exportSVG() {
    const svg = document.querySelector('#tikz-svg-container svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Exports the SVG diagram as a PDF file.
 * Converts the SVG to a high-resolution PNG on a canvas, then adds it to a PDF
 * using jsPDF. The PDF page orientation is determined by the image dimensions.
 */
function exportPDF() {
    const svg = document.querySelector('#tikz-svg-container svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        // Increase resolution by scaling up canvas
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Create PDF with appropriate orientation and page size
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'l' : 'p',
            unit: 'mm',
            format: [img.width * 0.5, img.height * 0.5], // Scale to reasonable page size
        });

        // Add the image to the PDF with high quality
        pdf.addImage(
            canvas.toDataURL('image/png', 1.0),
            'PNG',
            10,
            10,
            pdf.internal.pageSize.getWidth() - 20,
            pdf.internal.pageSize.getHeight() - 20
        );
        pdf.save('diagram.pdf');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}