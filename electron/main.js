const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Keep a global reference to prevent garbage collection.
let mainWindow = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 900,
		title: "Welcome to Tale Tail Solitaire",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	// In development, load from Vite dev server; in production load the built files.
	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
	}

	// Let the page's document.title drive the native title bar.
	mainWindow.on("page-title-updated", (event) => {
		// Allow the title change (default behavior).
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// Handle quit-app IPC message
ipcMain.on("quit-app", () => {
	app.quit();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	// On macOS, apps stay active until Cmd+Q.
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// Re-create window on macOS dock click.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
