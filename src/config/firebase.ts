import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env';

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {})
});

export const firestore = getFirestore(app);
