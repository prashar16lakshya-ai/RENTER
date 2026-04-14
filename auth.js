import {
  auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from './firebase-config.js';
import { showToast } from './utils.js';
import { db, upsertRecord } from './data.js';
import { generateId } from './utils.js';

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback?.(user);
  });
}

export async function loginWithEmailPassword(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    showToast('Welcome back!', 'success');
    return credential.user;
  } catch (error) {
    showToast(error.message || 'Login failed.', 'error');
    throw error;
  }
}

export async function signupWithEmailPassword(payload) {
  const {
    email,
    password,
    name,
    role,
    teamId = '',
    playerId = '',
    sport = ''
  } = payload;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }

    const localId = generateId('user');
    upsertRecord('users', localId, {
      id: localId,
      role,
      name: name || credential.user.displayName || 'Unnamed User',
      email,
      photoURL: credential.user.photoURL || '',
      authUid: credential.user.uid,
      teamId,
      playerId,
      sport,
      createdAt: new Date().toISOString()
    });

    showToast('Account created successfully!', 'success');
    return credential.user;
  } catch (error) {
    showToast(error.message || 'Sign up failed.', 'error');
    throw error;
  }
}

export async function loginWithGoogle(role = 'student') {
  try {
    const credential = await signInWithPopup(auth, GoogleAuthProvider);
    const user = credential.user;

    const existing = Object.values(db.users).find((entry) => entry.authUid === user.uid);
    if (!existing) {
      const localId = generateId('user');
      upsertRecord('users', localId, {
        id: localId,
        role,
        name: user.displayName || 'Google User',
        email: user.email,
        photoURL: user.photoURL || '',
        authUid: user.uid,
        teamId: '',
        playerId: '',
        sport: '',
        createdAt: new Date().toISOString()
      });
    }

    showToast('Google login successful!', 'success');
    return user;
  } catch (error) {
    showToast(error.message || 'Google login failed.', 'error');
    throw error;
  }
}

export async function signupWithGoogle(role, extras = {}) {
  const user = await loginWithGoogle(role);
  const existing = Object.values(db.users).find((entry) => entry.authUid === user.uid);
  if (existing) {
    upsertRecord('users', existing.id, {
      ...existing,
      role,
      teamId: extras.teamId || existing.teamId,
      playerId: extras.playerId || existing.playerId,
      sport: extras.sport || existing.sport
    });
  }
  return user;
}

export async function logout() {
  try {
    await signOut(auth);
    showToast('Signed out.', 'info');
  } catch (error) {
    showToast(error.message || 'Logout failed.', 'error');
    throw error;
  }
}
