
let isActivated = false;

/**
 * Renders the welcome screen.
 */
function onAppStart(activateAiTab) {
  const welcomeScreen = document.getElementById('welcome-screen');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
  }
  const contentContainer = document.getElementById('content-container');
  if (contentContainer) {
    // Hide all other pages
    for (const child of contentContainer.children) {
      if (child.id !== 'welcome-screen') {
        child.style.display = 'none';
      }
    }
  }

  window.electronAPI.onAuthResult((result) => {
    if (result && result.success) {
      isActivated = true;
      if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
      }
      activateAiTab();
    } else {
      console.error('Authentication failed', result && result.error);
    }
  });
}

/**
 * Hides the welcome screen and activates the AI tab.
 * @param {() => void} activateAiTab - Function to activate the AI tab.
 */
function onActivate(activateAiTab) {
  window.electronAPI.startAuth();
}

/**
 * Handles tab clicks. If not activated, it does nothing.
 * @param {string} tabId - The ID of the tab that was clicked.
 * @returns {boolean} - Whether the navigation should proceed.
 */
function onTabClick(tabId) {
  return isActivated;
}

export { onAppStart, onActivate, onTabClick };
