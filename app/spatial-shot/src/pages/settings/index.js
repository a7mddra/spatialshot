export function createPage() {
  const page = document.createElement('div');
  const electronAPI = window.electronAPI;

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  
  const userInfoMain = document.createElement('div');
  userInfoMain.className = 'user-info-main';
  
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  
  const userDetailsWrapper = document.createElement('div');
  userDetailsWrapper.className = 'user-details-wrapper';
  
  const userDetails = document.createElement('div');
  userDetails.className = 'user-details';
  const userName = document.createElement('h3');
  const userEmail = document.createElement('p');
  userDetails.appendChild(userName);
  userDetails.appendChild(userEmail);
  
  userDetailsWrapper.appendChild(userDetails);
  userInfoMain.appendChild(avatar);
  userInfoMain.appendChild(userDetailsWrapper);
  
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'logout-btn';
  logoutBtn.title = 'Log Out';
  logoutBtn.setAttribute('aria-label', 'Log out');
  const logoutIcon = document.createElement('i');
  logoutIcon.className = 'fas fa-sign-out-alt';
  logoutBtn.appendChild(logoutIcon);
  
  logoutBtn.addEventListener('click', () => {
    electronAPI.logout();
    window.location.reload();
  });

  userInfo.appendChild(userInfoMain);
  userInfo.appendChild(logoutBtn);

(async () => {
  const userData = await electronAPI.getUserData();
  if (userData) {
    avatar.src = userData.photoURL;
    userName.textContent = userData.name;
    userEmail.textContent = userData.email;
    
    setTimeout(() => {
      checkTextOverflow(userName, 'name');
      checkTextOverflow(userEmail, 'email');
    }, 100);
  } else {
    userName.textContent = 'Guest';
    userEmail.textContent = 'Not logged in';
  }
})();

  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';

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

  const promptBtn = createButton('promptBtn', 'fas fa-edit', 'Customize Prompt', false, true);
  const clearCacheBtn = createButton('clearCacheBtn', 'fas fa-broom', 'Clear Cache');
  const githubBtn = createButton(null, 'fab fa-github', 'GitHub Repository');
  githubBtn.addEventListener('click', () => electronAPI.openExternal('https://github.com/a7mddra/spatial-shot'));
  const bugBtn = createButton(null, 'fas fa-bug', 'Report Bug');
  const premiumBtn = createButton('premiumBtn', 'fas fa-crown', 'Spatial Shot Premium', false, true);
  const deleteBtn = createButton('deleteAccountBtn', 'fas fa-trash-alt', 'Delete Account');

  buttonGroup.appendChild(darkModeBtn);
  buttonGroup.appendChild(clearCacheBtn);
  buttonGroup.appendChild(promptBtn);
  buttonGroup.appendChild(premiumBtn);
  buttonGroup.appendChild(githubBtn);
  buttonGroup.appendChild(bugBtn);
  buttonGroup.appendChild(deleteBtn);

  page.appendChild(userInfo);
  page.appendChild(buttonGroup);

  return page;
}

function checkTextOverflow(textElement, elementType) {
  const textWidth = textElement.scrollWidth;
  const parentWidth = textElement.parentElement.clientWidth;
  
  if (textWidth > parentWidth) {
    const marqueeContainer = document.createElement('span');
    marqueeContainer.className = `marquee-container ${elementType}-marquee-container`;
    const marqueeContent = document.createElement('span');
    marqueeContent.className = 'marquee-content';
    marqueeContent.textContent = textElement.textContent + ' ' + textElement.textContent;
    marqueeContainer.appendChild(marqueeContent);
    
    textElement.textContent = '';
    textElement.appendChild(marqueeContainer);
    textElement.classList.add('marquee');
  }
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