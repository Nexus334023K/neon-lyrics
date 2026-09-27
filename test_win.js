const { app, BrowserWindow, screen } = require('electron');

app.whenReady().then(() => {
  const primary = screen.getPrimaryDisplay();
  console.log('Primary display:', primary.bounds, 'workArea:', primary.workArea);

  const win = new BrowserWindow({
    width: 600,
    height: 300,
    center: true,
    alwaysOnTop: true,
    frame: true,
    show: true,
    title: 'NeonLyrics Test Window'
  });

  win.loadURL('data:text/html,<html><body style="background:%23111;color:%2300f2fe;font-family:sans-serif;text-align:center;padding:40px;"><h1>NeonLyrics Test Window</h1><p style="color:white;font-size:20px;">If you see this window, Electron works!</p></body></html>');

  console.log('Bounds:', win.getBounds(), 'Visible:', win.isVisible());
});
