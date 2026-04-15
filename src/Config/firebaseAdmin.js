import admin from "firebase-admin";

let firebaseApp = null;

const formatPrivateKey = (privateKey) => {
  if (!privateKey) return null;
  return privateKey.replace(/\\n/g, "\n");
};

export const initializeFirebaseAdmin = () => {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return firebaseApp;
};

export const getFirebaseAuth = () => {
  const app = initializeFirebaseAdmin();
  return app.auth();
};
