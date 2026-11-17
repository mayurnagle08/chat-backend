
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env';
import path from 'path';

const serviceAccountPath = path.resolve(
  process.cwd(),
  'config/firebase-service-account.json'
);

const app = getApps()[0] ?? initializeApp({
  credential: cert(serviceAccountPath),
  ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {})
});

export const firestore = getFirestore(app);
