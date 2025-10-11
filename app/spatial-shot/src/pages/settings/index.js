import { showFeedbackMessage } from '../../shared/utils.js';
let avatar, userName, userEmail;

export function createPage() {
  const page = document.createElement('div');
  page.className = 'settings-page';
  const electronAPI = window.electronAPI;

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';

  const userInfoMain = document.createElement('div');
  userInfoMain.className = 'user-info-main';

  avatar = document.createElement('img');
  avatar.className = 'avatar';

  const userDetailsWrapper = document.createElement('div');
  userDetailsWrapper.className = 'user-details-wrapper';

  const userDetails = document.createElement('div');
  userDetails.className = 'user-details';
  userName = document.createElement('h3');
  userEmail = document.createElement('p');
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

  updateUserInfo();

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
  bugBtn.addEventListener('click', () => electronAPI.openExternal('https://api.whatsapp.com/send?phone=201019479808'));
  const premiumBtn = createButton('premiumBtn', 'fas fa-crown', 'Spatial Shot Premium', false, true);
  const deleteBtn = createButton('deleteAccountBtn', 'fas fa-trash-alt', 'Delete Account');

  buttonGroup.appendChild(darkModeBtn);
  buttonGroup.appendChild(clearCacheBtn);
  buttonGroup.appendChild(promptBtn);
  buttonGroup.appendChild(premiumBtn);
  buttonGroup.appendChild(githubBtn);
  buttonGroup.appendChild(bugBtn);
  buttonGroup.appendChild(deleteBtn);

  const promptView = document.createElement('div');
  promptView.className = 'prompt-view';
  promptView.id = 'promptView';

  const promptHeader = document.createElement('div');
  promptHeader.className = 'prompt-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.id = 'backPromptBtn';
  const backIcon = document.createElement('i');
  backIcon.className = 'fas fa-arrow-left';
  backBtn.appendChild(backIcon);

  const promptTitle = document.createElement('h2');
  promptTitle.textContent = 'Customize Prompt';

  promptHeader.appendChild(backBtn);
  promptHeader.appendChild(promptTitle);

  const promptContent = document.createElement('div');
  promptContent.className = 'prompt-content';

  const promptTextarea = document.createElement('textarea');
  promptTextarea.className = 'prompt-textarea';
  promptTextarea.id = 'promptTextarea';
  promptTextarea.placeholder = 'Write a prompt...';
  promptTextarea.value = 'Analyze this image and provide a detailed description focusing on the main subjects, colors, composition, and any notable details or patterns.'; 

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.id = 'savePromptBtn';
  const saveIcon = document.createElement('i');
  saveIcon.className = 'fas fa-save';
  saveBtn.appendChild(saveIcon);
  saveBtn.appendChild(document.createTextNode(' Save Prompt'));

  promptContent.appendChild(promptTextarea);
  promptContent.appendChild(saveBtn);

  promptView.appendChild(promptHeader);
  promptView.appendChild(promptContent);

  page.appendChild(userInfo);
  page.appendChild(buttonGroup);
  page.appendChild(promptView); 

  promptBtn.addEventListener('click', () => {
    promptView.classList.add('active');
    page.classList.add('subview-active'); 
  });

  backBtn.addEventListener('click', () => {
    promptView.classList.remove('active');
    page.classList.remove('subview-active'); 
  });

  saveBtn.addEventListener('click', () => {
      promptView.classList.remove('active');
      page.classList.remove('subview-active');
      showFeedbackMessage('Prompt saved', 'done');
  });

  return page;
}

export async function updateUserInfo() {
  const userData = await window.electronAPI.getUserData();
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