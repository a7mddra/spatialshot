export function createPage() {
  const wrap = document.createElement('div');
  wrap.className = 'lens-container';

  const webview = document.createElement('webview');
  webview.src = 'https://lens.google.com/search?ep=subb&re=df&s=4&hl=en';
  webview.style.width = '100%';
  webview.style.height = '100%';
  webview.style.border = 'none';

  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'contextIsolation=no');

  wrap.appendChild(webview);

  // <--- configure delay here (ms) --->
  const pasteDelay = 500; // 2000ms = 2s. Increase if the page needs more time.

  // Helper: try several common preload exposures to ask main to ensure maximize
  function sendEnsureMaximized() {
    try {
      // common contextBridge naming: window.electronAPI.ensureMaximized()
      if (window.electronAPI && typeof window.electronAPI.ensureMaximized === 'function') {
        // many preload wrappers return Promise — call and ignore result
        window.electronAPI.ensureMaximized();
        return;
      }

      // another common pattern: window.api.invoke or window.api.send
      if (window.api && typeof window.api.invoke === 'function') {
        window.api.invoke('ensure-maximized').catch(() => {});
        return;
      }

      // direct ipcRenderer exposure (less common with contextIsolation=true)
      if (window.electron && window.electron.ipcRenderer && typeof window.electron.ipcRenderer.send === 'function') {
        window.electron.ipcRenderer.send('ensure-maximized');
        return;
      }
      if (window.ipcRenderer && typeof window.ipcRenderer.send === 'function') {
        window.ipcRenderer.send('ensure-maximized');
        return;
      }

      // fallback: postMessage to preload (if your preload listens for these)
      window.postMessage && window.postMessage({ type: 'ensure-maximized' }, '*');
    } catch (e) {
      console.warn('sendEnsureMaximized failed:', e);
    }
  }

  webview.addEventListener('dom-ready', () => {
    // ensure the main window is maximized once the webview is ready
    sendEnsureMaximized();

    // Optionally try the page's paste button + clipboard API first (keeps behavior in-page)
    webview.executeJavaScript(`
      setTimeout(() => {
        const pasteButton = document.querySelector('.Vd9M6');
        if (pasteButton) pasteButton.click();

        try {
          navigator.clipboard.read().then(items => {
            // attempt a programmatic paste (may be blocked by permissions)
            document.execCommand('paste');
          }).catch(err => console.log('Clipboard read failed:', err));
        } catch (e) {
          console.log('Paste failed:', e);
        }
      }, 500); // small attempt earlier
    `).catch(err => console.warn('execJS failed:', err));

    // Wait additional time for the page to be interactive, then send ctrl+v
    setTimeout(() => {
      try {
        // Ensure the webview has focus so the paste lands where expected
        webview.focus();

        // Send a proper key sequence for Ctrl+V
        // Press Control down
        webview.sendInputEvent({ type: 'keyDown', keyCode: 'Control' });

        // Press V down with Control modifier
        webview.sendInputEvent({ type: 'keyDown', keyCode: 'V', modifiers: ['control'] });

        // Send a char event (some apps expect this)
        webview.sendInputEvent({ type: 'char', keyCode: 'v', modifiers: ['control'] });

        // Release V
        webview.sendInputEvent({ type: 'keyUp', keyCode: 'V', modifiers: ['control'] });

        // Release Control
        webview.sendInputEvent({ type: 'keyUp', keyCode: 'Control' });
      } catch (e) {
        console.error('Failed to send paste key events:', e);
      }
    }, pasteDelay);
  });

  // If you used the postMessage fallback above, you may need to listen here for confirmation
  // (optional) window.addEventListener('message', (ev) => { ... });

  return wrap;
}
