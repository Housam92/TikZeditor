/**
 * Main Electron process for the LaTeX Editor application.
 *
 * Responsibilities:
 * - Create and manage the main browser window.
 * - Define and attach the application menu.
 * - Handle IPC communication between the main and renderer processes
 *   for loading and saving LaTeX files.
 *
 * Modules used:
 * - electron: Core Electron APIs (app lifecycle, windows, menus, dialogs, IPC).
 * - path: For resolving file paths (preload script).
 * - fs: For reading/writing LaTeX files.
 */

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

/**
 * Creates the main application window and sets up the menu.
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Load preload script
            contextIsolation: true, // Isolate renderer and main worlds
            nodeIntegration: false, // Disable direct Node.js access in renderer
        }
    });

    // Load the initial HTML file (UI entry point)
    mainWindow.loadFile('index.html');

    // Open DevTools (remove in production if not needed)
    mainWindow.webContents.openDevTools();

    // Define application menu with File operations
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Load LaTeX...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        // Request renderer to trigger LaTeX load
                        mainWindow.webContents.send('request-load-latex');
                    }
                },
                {
                    label: 'Save as LaTeX...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        // Request renderer to trigger LaTeX save
                        mainWindow.webContents.send('request-save-latex');
                    }
                },
                { type: 'separator' },
                { role: 'copy' },
                { role: 'paste' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }
    ];

    // Build and set application menu
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Create window when app is ready
app.whenReady().then(createWindow);

/**
 * IPC handler: Load LaTeX file.
 *
 * Opens a file dialog for the user to select a `.tex` or `.txt` file.
 * Reads file contents and sends them back to the renderer process.
 */
ipcMain.on('request-load-latex', async (event) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Open LaTeX File',
        filters: [{ name: 'LaTeX Files', extensions: ['tex', 'txt'] }],
        properties: ['openFile']
    });

    if (!canceled && filePaths.length > 0) {
        try {
            const content = fs.readFileSync(filePaths[0], 'utf8');
            event.sender.send('reply-load-latex', content);
        } catch (err) {
            console.error('Failed to read file:', err);
        }
    }
});

/**
 * IPC handler: Save LaTeX file.
 *
 * Opens a save dialog and writes the provided LaTeX code to disk.
 * If saving fails, displays an error dialog.
 */
ipcMain.on('reply-save-latex', async (event, latexCode) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save LaTeX File',
        defaultPath: 'diagram.tex',
        filters: [{ name: 'LaTeX Files', extensions: ['tex'] }]
    });

    if (!canceled && filePath) {
        try {
            fs.writeFileSync(filePath, latexCode, 'utf8');
        } catch (err) {
            dialog.showErrorBox('Save Error', `Failed to save file: ${err.message}`);
        }
    }
});

/**
 * App lifecycle: Quit when all windows are closed (except on macOS).
 */
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
})
    // Read custom LaTeX packages
    let extraPackages = "";
    const pkgFile = path.join(__dirname, "latex-packages.txt");
    if (fs.existsSync(pkgFile)) {
        const lines = fs.readFileSync(pkgFile, "utf8").split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith("%"));
        extraPackages = lines.map(l => `\\usepackage{${l.trim()}}`).join("\n");
    }
;