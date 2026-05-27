const PROFILE_AVATAR_KEY = 'ajudapet-profile-avatar';

function getDefaultProfileImagePath() {
    return window.location.pathname.includes('/pages/') ? '../assets/images/usuario.png' : './assets/images/usuario.png';
}

function getProfileImagePath() {
    const storedAvatar = localStorage.getItem(PROFILE_AVATAR_KEY);
    return storedAvatar || getDefaultProfileImagePath();
}

function setProfileImage(dataUrl) {
    if (!dataUrl) return;
    localStorage.setItem(PROFILE_AVATAR_KEY, dataUrl);
}

function clearProfileImage() {
    localStorage.removeItem(PROFILE_AVATAR_KEY);
}

export {
    PROFILE_AVATAR_KEY,
    getDefaultProfileImagePath,
    getProfileImagePath,
    setProfileImage,
    clearProfileImage
};
