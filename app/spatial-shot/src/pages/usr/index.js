// ui/pages/account.js
export function createPage() {
  const page = document.createElement('div');
  page.className = 'page-center';

  const electronAPI = window.electronAPI;

  (async () => {
    const userData = await electronAPI.getUserData();

    if (userData) {
      page.innerHTML = `
        <style>
          .profile-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            color: #fff;
          }
          .profile-pic {
            width: 128px;
            height: 128px;
            border-radius: 50%;
            object-fit: cover;
          }
          .profile-name {
            font-size: 1.5rem;
            font-weight: 600;
          }
          .profile-email {
            font-size: 1rem;
            color: #aaa;
          }
        </style>
        <div class="profile-container">
          <img src="${userData.photoURL}" alt="User Avatar" class="profile-pic">
          <div class="profile-name">${userData.name}</div>
          <div class="profile-email">${userData.email}</div>
        </div>
      `;
    } else {
      page.textContent = 'Could not load user data.';
    }
  })();

  return page;
}
