export function createPage() {
  const page = document.createElement('div');
  const electronAPI = window.electronAPI;

  // User Info
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  const userDetails = document.createElement('div');
  userDetails.className = 'user-details';
  const userName = document.createElement('h3');
  const userEmail = document.createElement('p');
  userDetails.appendChild(userName);
  userDetails.appendChild(userEmail);
  userInfo.appendChild(avatar);
  userInfo.appendChild(userDetails);

  (async () => {
    const userData = await electronAPI.getUserData();
    if (userData) {
      avatar.src = userData.photoURL;
      userName.textContent = userData.name;
      userEmail.textContent = userData.email;
    } else {
      userName.textContent = 'Guest';
      userEmail.textContent = 'Not logged in';
    }
  })();

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';

  // Dark Mode Button
  const darkModeBtn = createButton('darkModeBtn', 'fas fa-moon', 'Dark Mode', true);
  const darkModeToggle = document.createElement('label');
  darkModeToggle.className = 'toggle';
  const darkModeCheckbox = document.createElement('input');
  darkModeCheckbox.type = 'checkbox';
  darkModeCheckbox.id = 'darkModeToggle';
  const darkModeSlider = document.createElement('span');
  darkModeSlider.className = 'toggle-slider';
  darkModeToggle.appendChild(darkModeCheckbox);
  darkModeToggle.appendChild(darkModeSlider);
  darkModeBtn.appendChild(darkModeToggle);

  // Customize Prompt Button
  const promptBtn = createButton('promptBtn', 'fas fa-edit', 'Customize Prompt', false, true);

  // Clear Cache Button
  const clearCacheBtn = createButton('clearCacheBtn', 'fas fa-broom', 'Clear Cache');

  // GitHub Button
  const githubBtn = createButton(null, 'fab fa-github', 'GitHub Repository');
  githubBtn.addEventListener('click', () => electronAPI.openExternal('https://github.com/a7mddra/spatial-shot'));

  // Report Bug Button
  const bugBtn = createButton(null, 'fas fa-bug', 'Report Bug');

  // Premium Button
  const premiumBtn = createButton('premiumBtn', 'fas fa-crown', 'Spatial Shot Premium', false, true);

  // Log Out Button
  const logoutBtn = createButton(null, 'fas fa-sign-out-alt', 'Log Out');
  logoutBtn.addEventListener('click', () => {
    electronAPI.logout();
    window.location.reload();
  });

  // Delete Account Button
  const deleteBtn = createButton('deleteAccountBtn', 'fas fa-trash-alt', 'Delete Account');

  buttonGroup.appendChild(darkModeBtn);
  buttonGroup.appendChild(clearCacheBtn);
  buttonGroup.appendChild(promptBtn);
  buttonGroup.appendChild(premiumBtn);
  buttonGroup.appendChild(githubBtn);
  buttonGroup.appendChild(bugBtn);
  buttonGroup.appendChild(logoutBtn);
  buttonGroup.appendChild(deleteBtn);

  page.appendChild(userInfo);
  page.appendChild(buttonGroup);

  return page;
}

function createButton(id, iconClass, text, isToggle = false, hasArrow = false) {
  const button = document.createElement('button');
  button.className = 'btn';
  if (id) button.id = id;

  const content = document.createElement('div');
  content.className = 'btn-content';

  const icon = document.createElement('i');
  icon.className = iconClass;

  const btnText = document.createElement('div');
  btnText.className = 'btn-text';
  btnText.textContent = text;

  content.appendChild(icon);
  content.appendChild(btnText);
  button.appendChild(content);

  if (hasArrow) {
    const arrow = document.createElement('div');
    arrow.className = 'btn-arrow';
    const arrowIcon = document.createElement('i');
    arrowIcon.className = 'fas fa-chevron-right';
    arrow.appendChild(arrowIcon);
    button.appendChild(arrow);
  }

  return button;
}