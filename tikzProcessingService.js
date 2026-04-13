/**
 * TikZ Processing Service
 * 
 * Handles TikZ code preprocessing, validation, and transformation
 * Consolidates functionality from tikzPreprocessor.js with additional features
 * 
 * @module services/tikzProcessingService
 */

export class TikzProcessingService {
  /**
   * Create a new TikZ processing service
   * @param {Object} config - Configuration options
   * @param {boolean} config.strictValidation - Enable strict TikZ validation
   * @param {boolean} config.autoFormat - Enable automatic code formatting
   */
  constructor(config = {}) {
    this.config = {
      strictValidation: config.strictValidation || false,
      autoFormat: config.autoFormat !== false
    };
  }

  /**
   * Preprocess TikZ code with line numbers for SVG mapping
   * @param {string} tikzCode - Original TikZ code
   * @returns {string} Preprocessed TikZ code with special comments
   */
  preprocessWithLineNumbers(tikzCode) {
    const lines = tikzCode.split('\n');
    let processedCode = '';
    let inTikzPicture = false;
    let lineNumber = 1;
    let inMultiLineCommand = false;
    let multiLineBuffer = '';
    let foreachStartLine = null;

    for (const line of lines) {
      // Check if we're entering or exiting tikzpicture environment
      if (line.includes('\\begin{tikzpicture}')) {
        inTikzPicture = true;
        processedCode += line + '\n';
      } else if (line.includes('\\end{tikzpicture}')) {
        inTikzPicture = false;
        processedCode += line + '\n';
      } else if (inTikzPicture) {
        const trimmedLine = line.trim();
        
        // Skip empty lines but still count them
        if (trimmedLine === '') {
          processedCode += line + '\n';
          lineNumber++;
          continue;
        }

        // Skip comment lines but still count them
        if (trimmedLine.startsWith('%')) {
          processedCode += line + '\n';
          lineNumber++;
          continue;
        }

        // Handle foreach loops - start tracking
        if (trimmedLine.startsWith('\\foreach') && !trimmedLine.endsWith(';')) {
          inMultiLineCommand = true;
          foreachStartLine = lineNumber;
          processedCode += `\\special{dvisvgm:raw <g id="line${lineNumber}">}\n`;
          processedCode += line + '\n';
        } 
        // Handle other multi-line commands
        else if (this.isMultiLineCommandStart(trimmedLine) && !trimmedLine.endsWith(';')) {
          inMultiLineCommand = true;
          multiLineBuffer = line;
          processedCode += `\\special{dvisvgm:raw <g id="line${lineNumber}">}\n`;
          processedCode += line + '\n';
        } else if (inMultiLineCommand) {
          // For foreach loops, use the start line number for all elements
          if (foreachStartLine !== null) {
            processedCode += `\\special{dvisvgm:raw <g id="line${foreachStartLine}">}\n`;
            processedCode += line + '\n';
            processedCode += `\\special{dvisvgm:raw </g>}\n`;
          } else {
            multiLineBuffer += '\n' + line;
            processedCode += line + '\n';
          }
          
          // Check if this line ends the multi-line command
          if (trimmedLine.endsWith(';')) {
            inMultiLineCommand = false;
            if (foreachStartLine !== null) {
              // Already closed individual foreach elements, no need for additional closing
              foreachStartLine = null;
            } else {
              processedCode += `\\special{dvisvgm:raw </g>}\n`;
            }
          }
        } else {
          // Regular single-line command
          processedCode += `\\special{dvisvgm:raw <g id="line${lineNumber}">}\n`;
          processedCode += line + '\n';
          processedCode += `\\special{dvisvgm:raw </g>}\n`;
        }
      } else {
        processedCode += line + '\n';
      }
      
      lineNumber++;
    }

    return processedCode;
  }

  /**
   * Check if a line starts a multi-line TikZ command
   * @param {string} line - The line to check
   * @returns {boolean} True if it starts a multi-line command
   * @private
   */
  isMultiLineCommandStart(line) {
    const multiLineCommands = [
      '\\foreach',
      '\\pgfplotsforeachungrouped',
      '\\graph',
      '\\matrix',
      '\\scope',
      '\\path'
    ];

    return multiLineCommands.some(cmd => line.startsWith(cmd) && !line.endsWith(';'));
  }

  /**
   * Check if a line contains a TikZ drawing command
   * @param {string} line - The line to check
   * @returns {boolean} True if it's a drawing command
   * @private
   */
  isDrawingCommand(line) {
    const drawingCommands = [
      '\\draw',
      '\\fill',
      '\\path',
      '\\node',
      '\\shade',
      '\\clip',
      '\\pattern',
      '\\graph',
      '\\coordinate',
      '\\foreach'
    ];

    return drawingCommands.some(cmd => line.startsWith(cmd) || line.includes(cmd + '['));
  }

  /**
   * Validate TikZ code for common syntax errors
   * @param {string} tikzCode - TikZ code to validate
   * @returns {Object} Validation result with errors and warnings
   */
  validateTikzCode(tikzCode) {
    const errors = [];
    const warnings = [];

    // Basic validation checks
    if (!tikzCode.trim()) {
      errors.push('TikZ code is empty');
      return { isValid: false, errors, warnings };
    }

    // Check for tikzpicture environment
    const hasBeginTikz = /\\begin{tikzpicture}/.test(tikzCode);
    const hasEndTikz = /\\end{tikzpicture}/.test(tikzCode);

    if (!hasBeginTikz) {
      errors.push('Missing \\begin{tikzpicture}');
    }
    if (!hasEndTikz) {
      errors.push('Missing \\end{tikzpicture}');
    }
    if (hasBeginTikz && !hasEndTikz) {
      errors.push('Unclosed tikzpicture environment');
    }

    // Check for common syntax issues
    const lines = tikzCode.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Check for missing semicolons in drawing commands
      if (this.isDrawingCommand(trimmedLine) && !trimmedLine.endsWith(';') && !trimmedLine.endsWith('}')) {
        warnings.push(`Line ${index + 1}: Drawing command might be missing semicolon`);
      }

      // Check for unbalanced braces
      const openBraces = (trimmedLine.match(/{/g) || []).length;
      const closeBraces = (trimmedLine.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        warnings.push(`Line ${index + 1}: Possible unbalanced braces`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Extract only the tikzpicture content from LaTeX code
   * @param {string} latexCode - Full LaTeX code
   * @returns {string} Extracted TikZ code
   */
  extractTikzContent(latexCode) {
    const tikzMatch = latexCode.match(/\\begin{tikzpicture}([\s\S]*?)\\end{tikzpicture}/);
    if (tikzMatch) {
      return `\\begin{tikzpicture}${tikzMatch[1]}\\end{tikzpicture}`;
    }
    return latexCode; // fallback if no tikzpicture env found
  }

  /**
   * Format TikZ code with consistent indentation
   * @param {string} tikzCode - TikZ code to format
   * @returns {string} Formatted TikZ code
   */
  formatTikzCode(tikzCode) {
    if (!this.config.autoFormat) {
      return tikzCode;
    }

    const lines = tikzCode.split('\n');
    let formattedCode = '';
    let indentLevel = 0;
    let inTikzPicture = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('\\begin{tikzpicture}')) {
        inTikzPicture = true;
        formattedCode += ' '.repeat(indentLevel * 2) + trimmedLine + '\n';
        indentLevel++;
      } else if (trimmedLine.includes('\\end{tikzpicture}')) {
        indentLevel = Math.max(0, indentLevel - 1);
        formattedCode += ' '.repeat(indentLevel * 2) + trimmedLine + '\n';
        inTikzPicture = false;
      } else if (inTikzPicture) {
        // Handle scope environments
        if (trimmedLine.includes('\\begin{scope}')) {
          formattedCode += ' '.repeat(indentLevel * 2) + trimmedLine + '\n';
          indentLevel++;
        } else if (trimmedLine.includes('\\end{scope}')) {
          indentLevel = Math.max(0, indentLevel - 1);
          formattedCode += ' '.repeat(indentLevel * 2) + trimmedLine + '\n';
        } else {
          formattedCode += ' '.repeat(indentLevel * 2) + trimmedLine + '\n';
        }
      } else {
        formattedCode += trimmedLine + '\n';
      }
    }

    return formattedCode;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance for easy access
export const tikzProcessingService = new TikzProcessingService();

export default tikzProcessingService;
