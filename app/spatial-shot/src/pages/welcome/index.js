
let isActivated = false;

function onAppStart(activateAiTab) {
  const welcomeScreen = document.getElementById('welcome-screen');
  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
  }
  const contentContainer = document.getElementById('content-container');
  if (contentContainer) {
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

function onActivate(activateAiTab) {
  window.electronAPI.startAuth();
}

function onTabClick(tabId) {
  return isActivated;
}

export { onAppStart, onActivate, onTabClick };
