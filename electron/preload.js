// Preload script — runs in a sandboxed renderer context.
// Add any contextBridge / ipcRenderer exposures here as needed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	platform: process.platform,
	quitApp: () => ipcRenderer.send("quit-app"),
});
