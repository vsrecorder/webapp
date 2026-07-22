import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

// Firebaseの認証ユーザー削除に失敗した際のリトライ回数と間隔。
// 消し損ねると「Firebaseにのみ存在するユーザー」が残ってしまうため、
// 一時的な失敗は数回粘って回収する。
const DELETE_RETRY_COUNT = 3;
const DELETE_RETRY_INTERVAL_MS = 500;

let firebaseAdmin: admin.app.App;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Firebaseの認証ユーザーを削除する。一時的な失敗に備えてリトライし、
// 最終的に削除できたかどうかを返す。呼び出し側は戻り値を握り潰さずログに残すこと。
// 消し残した認証ユーザーは core-apiserver の cmd/check-firebase-users で検出できる。
export async function deleteFirebaseUserWithRetry(
  app: admin.app.App,
  uid: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= DELETE_RETRY_COUNT; attempt++) {
    try {
      await app.auth().deleteUser(uid);
      return true;
    } catch (error) {
      // 既に存在しない場合は「Firebaseに認証ユーザーが居ない」という目的の状態が
      // 達成できているため、成功として扱う
      if (error instanceof Error && "code" in error && error.code === "auth/user-not-found") {
        return true;
      }

      if (attempt === DELETE_RETRY_COUNT) {
        console.error(
          `Failed to delete firebase user after ${DELETE_RETRY_COUNT} attempts:`,
          uid,
          error,
        );
        return false;
      }

      console.warn(
        `Failed to delete firebase user (attempt ${attempt}/${DELETE_RETRY_COUNT}), retrying:`,
        uid,
      );
      await sleep(DELETE_RETRY_INTERVAL_MS);
    }
  }

  return false;
}

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
