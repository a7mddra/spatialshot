export function createPage() {
  const page = document.createElement('div');
  page.className = 'page-center';
  page.style.flexDirection = 'column';
  page.style.gap = '1rem';

  const electronAPI = window.electronAPI;

  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Log Out';
  logoutBtn.onclick = () => {
    electronAPI.logout();
    window.location.reload();
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete Account';
  deleteBtn.style.backgroundColor = '#8B0000'; // Dark Red
  deleteBtn.onclick = async () => {
    const userData = await electronAPI.getUserData();
    if (userData && confirm('Are you sure you want to permanently delete your account?')) {
      await electronAPI.deleteAccount(userData.email);
      window.location.reload();
    }
  };

  page.appendChild(logoutBtn);
  page.appendChild(deleteBtn);

  return page;
}
