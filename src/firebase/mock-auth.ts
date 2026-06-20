'use client';

type AuthListener = (user: any) => void;

class MockAuth {
  private listeners: AuthListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'tpmaster_session') {
          this.triggerStateChange(this.currentUser);
        }
      });
    }
  }

  get currentUser() {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('tpmaster_session');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }

  onAuthStateChanged(callback: AuthListener) {
    this.listeners.push(callback);
    const user = this.currentUser;
    setTimeout(() => callback(user), 0);

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  triggerStateChange(user: any) {
    this.listeners.forEach(l => {
      try {
        l(user);
      } catch (e) {
        console.error(e);
      }
    });
  }

  async signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tpmaster_session');
    }
    this.triggerStateChange(null);
  }
}

export const mockAuth = new MockAuth();

export async function signInWithEmailAndPassword(auth: any, email: string, pass: string) {
  if (email.trim() === 'ali@tpmaster.com' && pass === '12345678') {
    const mockUser = {
      uid: 'ali-uid',
      email: 'ali@tpmaster.com',
      emailVerified: true,
      displayName: 'Ali'
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpmaster_session', JSON.stringify(mockUser));
    }
    mockAuth.triggerStateChange(mockUser);
    return { user: mockUser };
  } else {
    // Throw standard Firebase auth exception structure to be compatible with Login.tsx
    const err: any = new Error('auth/wrong-password');
    err.code = 'auth/wrong-password';
    err.message = 'Firebase: Error (auth/wrong-password).';
    throw err;
  }
}

export async function createUserWithEmailAndPassword(auth: any, email: string, pass: string) {
  const err: any = new Error('auth/email-already-in-use');
  err.code = 'auth/email-already-in-use';
  err.message = 'Firebase: Error (auth/email-already-in-use).';
  throw err;
}

export async function sendPasswordResetEmail(auth: any, email: string) {
  return true;
}
