/**
 * IPC communication bridge for window management
 */
export function sendEnsureMaximized() {
  try {
    if (window.electronAPI && typeof window.electronAPI.ensureMaximized === 'function') {
      window.electronAPI.ensureMaximized();
      return;
    }

    if (window.api && typeof window.api.invoke === 'function') {
      window.api.invoke('ensure-maximized').catch(() => {});
      return;
    }

    if (window.electron && window.electron.ipcRenderer && typeof window.electron.ipcRenderer.send === 'function') {
      window.electron.ipcRenderer.send('ensure-maximized');
      return;
    }
    if (window.ipcRenderer && typeof window.ipcRenderer.send === 'function') {
      window.ipcRenderer.send('ensure-maximized');
      return;
    }

    window.postMessage && window.postMessage({ type: 'ensure-maximized' }, '*');
  } catch (e) {
    console.warn('sendEnsureMaximized failed:', e);
  }
}
