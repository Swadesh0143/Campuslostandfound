// Admin Authentication State Manager
const STORAGE_KEY_TOKEN = 'campusfind_admin_token';
const STORAGE_KEY_USER = 'campusfind_admin_user';

export const authState = {
  getToken() {
    return sessionStorage.getItem(STORAGE_KEY_TOKEN);
  },

  getUser() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  setSession(token, user) {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    window.dispatchEvent(new Event('auth-state-change'));
  },

  clearSession() {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_USER);
    window.dispatchEvent(new Event('auth-state-change'));
  },

  /**
   * Performs administrator login
   */
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // In a full Cognito deployment, this initiates InitiateAuth against Cognito User Pool.
    // For development and testing with backend dev token:
    if (password === 'AdminPass123!' || password === 'test-admin-pass') {
      const mockUser = {
        username,
        role: 'Administrator',
        email: `${username}@campus.edu`,
      };
      const token = 'valid-admin-test-token';
      this.setSession(token, mockUser);
      return { success: true, user: mockUser };
    }

    // Real production error
    throw new Error('Invalid campus administrator credentials. Please check your credentials or contact IT security.');
  },

  logout() {
    this.clearSession();
  },
};
