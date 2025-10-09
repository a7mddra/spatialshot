const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function getProfilePath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'profile.json');
}

function saveUserData(data) {
  try {
    const profilePath = getProfilePath();
    const userDataPath = path.dirname(profilePath);
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    fs.writeFileSync(profilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
}

function getUserData() {
  try {
    const profilePath = getProfilePath();
    if (fs.existsSync(profilePath)) {
      const data = fs.readFileSync(profilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read user data:', error);
  }
  return null;
}

function clearUserData() {
  try {
    const profilePath = getProfilePath();
    if (fs.existsSync(profilePath)) {
      fs.unlinkSync(profilePath);
    }
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

module.exports = {
  saveUserData,
  getUserData,
  clearUserData,
};
