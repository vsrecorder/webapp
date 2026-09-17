"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  browserPopupRedirectResolver,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";
import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/*
 * Firebase Auth はサインイン(signInWithPopup)で ID トークンを 1 回受け取るためだけに使う。
 * ログイン状態は NextAuth の httpOnly Cookie が持つので、Firebase 側のリフレッシュトークンを
 * 端末に残す必要が無い。既定の永続化(IndexedDB)のままだと、サインイン後もリフレッシュトークンが
 * ブラウザに残り続け、XSS が成立した場合に新しい ID トークンを取って
 * /api/auth/callback/credentials へ投げ直すことで httpOnly の守りを迂回できてしまう。
 * メモリ内に限定すれば、タブを閉じた時点で消える。
 *
 * ポップアップのフローは永続化に依存しない(結果は同じページに戻る)。リダイレクト方式
 * (signInWithRedirect)は復帰時に永続化が要るので、切り替える場合はここも見直すこと。
 * popupRedirectResolver は initializeAuth で明示しないと signInWithPopup が使えない。
 */
function createClientAuth(firebaseApp: FirebaseApp): Auth {
  try {
    return initializeAuth(firebaseApp, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // HMR などで同じ app に対して二度目に評価されると auth/already-initialized になる。
    // そのときは初期化済みのものをそのまま使う
    return getAuth(firebaseApp);
  }
}

export const firebaseClientAuth = createClientAuth(app);
