const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'StacionaT - Gestión de Estacionamiento',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Permitir peticiones CORS si es necesario
    },
    autoHideMenuBar: true, // Ocultar el menú superior (Archivo, Edición, etc)
  });

  // En producción, carga el archivo index.html compilado por Vite
  const indexHtml = path.join(__dirname, '../dist/index.html');
  win.loadFile(indexHtml);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
