import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_FIREBASE_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_FIREBASE_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_FIREBASE_APP_ID'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFirestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  auth,
  dbFirestore,
  googleProvider as GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
};
