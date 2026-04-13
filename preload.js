/**
 * Preload script for the LaTeX Editor application.
 *
 * Purpose:
 * - Acts as a secure bridge between the renderer (web page) and the main process.
 * - Exposes limited, controlled APIs to the renderer through `window.electronAPI`.
 * - Prevents direct Node.js access in the renderer when `contextIsolation` is enabled.
 *
 * Modules used:
 * - electron: Provides `contextBridge` for exposing safe APIs, and `ipcRenderer` for IPC communication.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe APIs in the renderer's `window.electronAPI`.
 *
 * Provides:
 * - `versions`: Functions to query runtime versions of Node.js, Chromium, and Electron.
 * - `ipc`: Wrappers around IPC communication methods (listen and send).
 */
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Runtime versions (Node, Chrome, Electron).
     * Example usage in renderer:
     *   console.log(window.electronAPI.versions.node());
     */
    versions: {
        node: () => process.versions.node,
        chrome: () => process.versions.chrome,
        electron: () => process.versions.electron
    },

    /**
     * IPC communication layer between renderer and main.
     * Example usage in renderer:
     *   window.electronAPI.ipc.send('request-load-latex');
     *   window.electronAPI.ipc.on('reply-load-latex', (event, data) => { ... });
     */
    ipc: {
        /**
         * Subscribe to an IPC channel.
         * @param {string} channel - IPC channel name.
         * @param {function} callback - Function called when a message is received.
         */
        on: (channel, callback) => ipcRenderer.on(channel, callback),

        /**
         * Send a message to the main process via IPC.
         * @param {string} channel - IPC channel name.
         * @param {...any} args - Arguments to send with the message.
         */
        send: (channel, ...args) => ipcRenderer.send(channel, ...args)
    }
});