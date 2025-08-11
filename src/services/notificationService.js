import admin from 'firebase-admin';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

let initialized = false;

export function initFCM() {
  if (initialized) return;
  const path = process.env.FCM_SERVICE_ACCOUNT_PATH;
  if (!path || !fs.existsSync(path)) {
    console.warn('FCM service account not found, push disabled. Set FCM_SERVICE_ACCOUNT_PATH');
    return;
  }
  const serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  initialized = true;
}

export async function sendFCM(tokens = [], notification = {}, data = {}) {
  if (!initialized) initFCM();
  if (!admin.apps.length) {
    console.warn('FCM not initialized. Skipping push notification.');
    return null;
  }
  if (!tokens || tokens.length === 0) return null;
  const message = {
    notification,
    data: typeof data === 'object' ? Object.fromEntries(Object.entries(data).map(([k,v]) => [k, String(v)])) : {},
    tokens
  };
  try {
    const res = await admin.messaging().sendMulticast(message);
    return res;
  } catch (err) {
    console.error('FCM send error', err);
    return null;
  }
}
