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

// 「このサインインで初めて作成された認証ユーザー」とみなす時間幅。
// サインインの一連の処理が数分で終わる前提で、作成直後のユーザーだけを対象にする。
const FRESHLY_CREATED_WINDOW_MS = 10 * 60 * 1000;

// このサインインで初めて作成された認証ユーザーかどうかを判定する。
// DBの状態を確認できなかった経路では「既存ユーザーなのかDB未登録の新規ユーザーなのか」を
// 区別できないため、誤って既存ユーザーを削除しないようにこの判定を挟む。
//
// 作成から間もないことだけを条件にしている。既存ユーザーは作成時刻が古いので必ず外れ、
// DB登録に失敗して取り残された過去の認証ユーザーも同様に対象外になる
// （そちらはDBの状態を確認できた経路で無条件に削除される）。
// 判定に失敗した場合は削除しない側に倒す。
async function isFreshlyCreatedUser(app: admin.app.App, uid: string): Promise<boolean> {
  try {
    const { metadata } = await app.auth().getUser(uid);

    const createdAt = Date.parse(metadata.creationTime);
    if (Number.isNaN(createdAt)) {
      return false;
    }

    return Date.now() - createdAt <= FRESHLY_CREATED_WINDOW_MS;
  } catch (error) {
    console.error("Failed to check if firebase user is freshly created:", uid, error);
    return false;
  }
}

// このサインインで作成されたばかりの認証ユーザーに限って削除する。
// DBに登録できたか確証が持てない経路（疎通失敗・5xxなど）からのロールバック用。
// 削除したかどうかを返す。
export async function deleteFirebaseUserIfFreshlyCreated(
  app: admin.app.App,
  uid: string,
): Promise<boolean> {
  if (!(await isFreshlyCreatedUser(app, uid))) {
    return false;
  }

  return await deleteFirebaseUserWithRetry(app, uid);
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
