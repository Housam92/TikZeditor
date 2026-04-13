/**
 * Editor Configuration Service
 * 
 * Handles Monaco editor configuration, theme setup, and language definitions
 * Consolidates editor configuration from editor.js
 * 
 * @module services/editorConfigService
 */

export class EditorConfigService {
  /**
   * Create a new editor configuration service
   * @param {Object} config - Configuration options
   * @param {boolean} config.autoLayout - Enable automatic layout
   * @param {boolean} config.enableMinimap - Enable minimap
   */
  constructor(config = {}) {
    this.config = {
      autoLayout: config.autoLayout !== false,
      enableMinimap: config.enableMinimap !== false
    };
    
    this.monaco = null;
  }

  /**
   * Set the Monaco instance for the service
   * @param {Object} monaco - Monaco editor instance
   */
  setMonaco(monaco) {
    this.monaco = monaco;
  }

  /**
   * Configure the TikZ language for Monaco
   */
  configureTikZLanguage() {
    if (!this.monaco) {
      console.warn('Monaco instance not set. Call setMonaco() first.');
      return;
    }

    this.monaco.languages.register({ id: 'tikz' });
    this.monaco.languages.setMonarchTokensProvider('tikz', {
      defaultToken: '',
      tokenPostfix: '.tex',
      keywords: [
        'begin', 'end', 'draw', 'node', 'path', 'fill', 'clip', 'shade',
        'coordinate', 'circle', 'rectangle', 'grid', 'ellipse', 'arc',
        'to', 'and', 'foreach', 'let', 'in', 'if', 'then', 'else',
        'matrix', 'pic', 'scope', 'useasboundingbox', 'pattern', 'decorate',
        'plot', 'smooth', 'cycle', 'edge', 'graph', 'digraph', 'subgraph'
      ],
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      tokenizer: {
        root: [
          [/%.*$/, 'comment'], // LaTeX comments
          [/\\([a-zA-Z]+)/, { cases: { 
            '@keywords': 'keyword',
            '@default': 'keyword' 
          }}],
          [/[{}]/, 'delimiter.bracket'],
          [/\[|\]/, 'delimiter.array'],
          [/(\d+\.?\d*)|(\.\d+)/, 'number'],
          [/[;,.:]/, 'delimiter'],
          [/([<>]=?|==|!=)/, 'operator'],
          [/\$[^\$]*\$/, 'string.math'], // Math mode
          [/"[^"]*"|'[^']*'/, 'string'], // Strings
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          [/[+-]?[0-9]+(\.[0-9]+)?(pt|mm|cm|in|ex|em)/, 'number.unit'] // Units
        ]
      }
    });

    this.registerTikZTheme();
    this.registerTikZSnippets();
  }

  /**
   * Register the TikZ theme for Monaco
   * @private
   */
  registerTikZTheme() {
    this.monaco.editor.defineTheme('tikz-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'number.unit', foreground: '86C691' },
        { token: 'delimiter.bracket', foreground: 'FFD700' },
        { token: 'delimiter.array', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'string.math', foreground: 'DCDCAA' },
        { token: 'comment', foreground: '6A9955' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'identifier', foreground: '9CDCFE' }
      ],
      colors: {
        'editor.background': '#2a2a3c',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2e2e42',
        'editor.lineHighlightBorder': '#3a3a4a',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editor.findMatchBackground': '#515C6A',
        'editor.findMatchHighlightBackground': '#EA5C0055',
        'editor.findRangeHighlightBackground': '#3a3d4166',
        'editor.hoverHighlightBackground': '#264f7840',
        'editor.lineNumbers': '#858585',
        'editor.lineNumbers.active': '#C6C6C6',
        'editorCursor.foreground': '#AEAFAD',
        'editorWhitespace.foreground': '#404040',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888'
      }
    });
  }

  /**
   * Register TikZ code snippets for autocompletion
   * @private
   */
  registerTikZSnippets() {
    this.monaco.languages.registerCompletionItemProvider('tikz', {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: 'circle',
            kind: this.monaco.languages.CompletionItemKind.Snippet,
            insertText: 'circle (${1:radius})',
            documentation: 'Draw a circle'
          },
          {
            label: 'rectangle',
            kind: this.monaco.languages.CompletionItemKind.Snippet,
            insertText: 'rectangle (${1:point1}) -- (${2:point2})',
            documentation: 'Draw a rectangle'
          },
          {
            label: 'node',
            kind: this.monaco.languages.CompletionItemKind.Snippet,
            insertText: 'node[${1:options}] {${2:text}}',
            documentation: 'Add a text node'
          },
          {
            label: 'draw',
            kind: this.monaco.languages.CompletionItemKind.Snippet,
            insertText: 'draw (${1:start}) -- (${2:end});',
            documentation: 'Draw a line'
          },
          {
            label: 'fill',
            kind: this.monaco.languages.CompletionItemKind.Snippet,
            insertText: 'fill[${1:color}] (${2:point}) circle (${3:radius});',
            documentation: 'Fill a circle'
          }
        ]
      })
    });
  }

  /**
   * Create editor instance with standard TikZ configuration
   * @param {string} containerId - HTML element ID for the editor
   * @param {string} initialValue - Initial code content
   * @returns {Object} Monaco editor instance
   */
  createEditor(containerId, initialValue) {
    if (!this.monaco) {
      throw new Error('Monaco instance not set. Call setMonaco() first.');
    }

    return this.monaco.editor.create(document.getElementById(containerId), {
      value: initialValue,
      language: 'tikz',
      theme: 'tikz-theme',
      automaticLayout: this.config.autoLayout,
      minimap: { enabled: this.config.enableMinimap },
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      fontSize: 14,
      bracketPairColorization: { enabled: true },
      guides: { indentation: true },
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showWords: true
      },
      contextmenu: true,
      readOnly: false,
      selectionHighlight: true,
      occurrencesHighlight: true,
      renderLineHighlight: 'all',
      lineHighlight: 'line',
      cursorStyle: 'line',
      cursorBlinking: 'phase',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      mouseWheelZoom: true,
      accessibilitySupport: 'on'
    });
  }

  /**
   * Update editor configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current editor configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance for easy access
export const editorConfigService = new EditorConfigService();

export default editorConfigService;
