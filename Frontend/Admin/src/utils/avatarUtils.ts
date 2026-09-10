export function getUserAvatarKey(email?: string): string {
  if (!email) return 'medikit-user-avatar-default'
  return `medikit-user-avatar-${email.trim().toLowerCase()}`
}

export function getUserAvatar(email?: string): string {
  if (!email) return ''
  return localStorage.getItem(getUserAvatarKey(email)) || ''
}

export function setUserAvatar(email: string, avatarUrl: string): void {
  if (!email) return
  const key = getUserAvatarKey(email)
  if (avatarUrl) {
    localStorage.setItem(key, avatarUrl)
  } else {
    localStorage.removeItem(key)
  }
  window.dispatchEvent(new Event('medikit-avatar-changed'))
}
