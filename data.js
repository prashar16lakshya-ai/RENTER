import {
  dbFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from './firebase-config.js';
import { showToast } from './utils.js';

export const DEFAULT_DATA = {
  users: {},
  teams: {},
  players: {},
  attendance: {},
  matches: {},
  notifications: {}
};

export let db = structuredClone(DEFAULT_DATA);

const APP_DOC_PATH = ['appData', 'sportsync-main'];
let saveTimer = null;
let unsubscribe = null;

export async function loadDataFirebase() {
  const ref = doc(dbFirestore, ...APP_DOC_PATH);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    db = { ...structuredClone(DEFAULT_DATA), ...snap.data() };
  } else {
    db = structuredClone(DEFAULT_DATA);
    await setDoc(ref, db);
  }

  return db;
}

export function saveDataFirebase(data) {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(async () => {
    try {
      const ref = doc(dbFirestore, ...APP_DOC_PATH);
      await setDoc(ref, data, { merge: true });
    } catch (error) {
      showToast(error.message || 'Failed to save data.', 'error');
    }
  }, 350);
}

export function syncData(onChange) {
  const ref = doc(dbFirestore, ...APP_DOC_PATH);
  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      db = { ...structuredClone(DEFAULT_DATA), ...snap.data() };
      onChange?.(db);
    }
  });

  return unsubscribe;
}

export function upsertRecord(collectionName, id, payload) {
  db[collectionName][id] = {
    ...(db[collectionName][id] || {}),
    ...payload
  };
  saveDataFirebase(db);
}
