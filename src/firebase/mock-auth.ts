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
  const cleanEmail = email.trim().toLowerCase();
  
  let userObject = null;
  if (cleanEmail === 'ali@tpmaster.com' && pass === '12345678') {
    userObject = { uid: 'ali-uid', email: 'ali@tpmaster.com', emailVerified: true, displayName: 'Ali' };
  } else if (cleanEmail === 'admin@tpmaster.com' && pass === '12345678') {
    userObject = { uid: 'admin-uid', email: 'admin@tpmaster.com', emailVerified: true, displayName: 'Admin' };
  } else if (cleanEmail === 'tarik@tpmaster.ma' && pass === '12345678') {
    userObject = { uid: 'tarik-uid', email: 'tarik@tpmaster.ma', emailVerified: true, displayName: 'Tarik' };
  } else if (cleanEmail === 'ghalem092@gmail.com' && pass === 'MW_Pgy5xf4@q(MM') {
    userObject = { uid: 'ghalem-uid', email: 'ghalem092@gmail.com', emailVerified: true, displayName: 'Ghalem' };
  }

  if (userObject) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tpmaster_session', JSON.stringify(userObject));
    }
    mockAuth.triggerStateChange(userObject);
    return { user: userObject };
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
