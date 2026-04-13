/**
 * Preprocesses TikZ code by adding special comments with line numbers
 * before rendering, so that SVG elements get proper IDs for mapping.
 * 
 * @param {string} tikzCode The original TikZ code
 * @returns {string} Preprocessed TikZ code with special comments
 */
export function preprocessTikzWithLineNumbers(tikzCode) {
  const lines = tikzCode.split('\n');
  let processedCode = '';
  let inTikzPicture = false;
  let lineNumber = 1;

  for (const line of lines) {
    // Check if we're entering or exiting tikzpicture environment
    if (line.includes('\\begin{tikzpicture}')) {
      inTikzPicture = true;
      processedCode += line + '\n';
    } else if (line.includes('\\end{tikzpicture}')) {
      inTikzPicture = false;
      processedCode += line + '\n';
    } else if (inTikzPicture) {
      // Onlly add special comments inside tikzpicture environment
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (trimmedLine === '' || trimmedLine.startsWith('%')) {
        processedCode += line + '\n';
        lineNumber++;
        continue;
      }

      //      Add special comment before drawing commands.
      if (isDrawingCommand(trimmedLine)) {
        processedCode += `\\special{dvisvgm:raw <g id="line${lineNumber}">}\n`;
        processedCode += line + '\n';
        processedCode += `\\special{dvisvgm:raw </g>}\n`;
      } else {
        processedCode += line + '\n';
      }
    } else {
      processedCode += line + '\n';
    }
    
    lineNumber++;
  }

  return processedCode;
}

/**
 * Checks if a line contains a TikZ drawing command
 * @param {string} line The line to check
 * @returns {boolean} True if it's a drawing command
 */
function isDrawingCommand(line) {
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
 * Alternative approach: Add special comments to every line inside tikzpicture
 * This ensures 100% mapping accuracy for complex cases
 * 
 * @param {string} tikzCode The original TikZ code
 * @returns {string} Preprocessed TikZ code with special comments on every line
 */
export function preprocessAllLinesWithNumbers(tikzCode) {
  const lines = tikzCode.split('\n');
  let processedCode = '';
  let inTikzPicture = false;
  let lineNumber = 1;
  let inMultiLineCommand = false;
  let multiLineBuffer = '';

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

      // Handle multi-line commands (like foreach with indented content)
      if (isMultiLineCommandStart(trimmedLine) && !trimmedLine.endsWith(';')) {
        inMultiLineCommand = true;
        multiLineBuffer = line;
        processedCode += `\\special{dvisvgm:raw <g id="line${lineNumber}">}\n`;
        processedCode += line + '\n';
      } else if (inMultiLineCommand) {
        multiLineBuffer += '\n' + line;
        processedCode += line + '\n';
        
        // Check if this line ends the multi-line command
        if (trimmedLine.endsWith(';')) {
          inMultiLineCommand = false;
          processedCode += `\\special{dvisvgm:raw </g>}\n`;
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
 * Checks if a line starts a multi-line TikZ command
 * @param {string} line The line to check
 * @returns {boolean} True if it starts a multi-line command
 */
function isMultiLineCommandStart(line) {
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
