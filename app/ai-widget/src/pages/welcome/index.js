
let isActivated = false;

/**
 * Renders the welcome screen.
 */
function onAppStart() {
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
}

/**
 * Hides the welcome screen and activates the AI tab.
 * @param {() => void} activateAiTab - Function to activate the AI tab.
 */
function onActivate(activateAiTab) {
  isActivated = true;
  const welcomeScreen = document.getElementById('welcome-screen');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
  activateAiTab();
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
