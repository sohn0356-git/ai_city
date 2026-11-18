import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const missingFirebaseKeys = Object.entries(config).filter(([, value]) => !value?.trim()).map(([key]) => key);
export let app = null;
export let auth = null;
export let firebaseError = null;
if (!missingFirebaseKeys.length) {
  try {
    app = getApps().length ? getApp() : initializeApp(config);
    auth = getAuth(app);
  } catch (error) {
    firebaseError = error;
  }
}
