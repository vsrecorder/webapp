import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

let firebaseAdmin: admin.app.App;

export function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    if (admin.apps[0]) {
      return admin.apps[0];
    }
  }

  if (!firebaseAdmin) {
    const sa: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    if (!sa.privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY is not set");
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(sa),
    });
  }

  return firebaseAdmin;
}
