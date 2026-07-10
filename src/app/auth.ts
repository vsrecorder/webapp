import NextAuth, { CredentialsSignin } from "next-auth";
import "next-auth/jwt";

import * as jwt from "jsonwebtoken";

import Credentials from "next-auth/providers/credentials";

import { getFirebaseAdmin } from "@firebase/admin";

import type { DecodedIdToken } from "firebase-admin/auth";

// バックエンド(core-apiserver)に疎通できない場合に投げるエラー。
// CredentialsSigninを継承することで /auth/error?code=backend_unavailable にリダイレクトされ、
// 専用の案内画面を表示できる。
class BackendUnavailableError extends CredentialsSignin {
  code = "backend_unavailable";
}

type Credential = Partial<Record<"callbackUrl" | "idToken" | "csrfToken", unknown>>;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    };
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    userCheckedAt?: number;
  }
}

// 退会済みユーザーのセッションを検知するためのキャッシュ有効期間（ミリ秒）
const USER_CHECK_CACHE_MS = 5 * 60 * 1000;

// バックエンドのデプロイ中や一時的な障害などで偶発的に404が返るケースがあるため、
// 1回の404だけで退会済みと断定せず、連続して404が返り続けた場合のみ退会済みと判定する
const NOT_FOUND_RETRY_COUNT = 3;
const NOT_FOUND_RETRY_INTERVAL_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// core-apiserver上にユーザーが存在するか確認する。
// プロキシ層の障害時などにバックエンドを経由しない404(HTMLのエラーページ等)が
// 返ることがあるため、実際にcore-apiserverが返すJSON形式の404であることも
// 確認した上で判定する。
// 一時的な404が返っただけで退会済みと誤判定しないよう、404を検知した場合は
// 間隔を空けて最大NOT_FOUND_RETRY_COUNT回まで再確認し、
// 全て404だった場合にのみ退会済みと判定する。
async function isUserDeletedOnBackend(domain: string, uid: string): Promise<boolean> {
  for (let attempt = 1; attempt <= NOT_FOUND_RETRY_COUNT; attempt++) {
    const ret = await fetch(`https://` + domain + `/api/v1beta/users/` + uid, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const isBackendNotFound =
      ret.status === 404 &&
      (ret.headers.get("content-type") ?? "").includes("application/json");

    if (!isBackendNotFound) {
      return false;
    }

    if (attempt < NOT_FOUND_RETRY_COUNT) {
      console.warn(
        `User check returned 404 (attempt ${attempt}/${NOT_FOUND_RETRY_COUNT}), retrying:`,
        uid,
      );
      await sleep(NOT_FOUND_RETRY_INTERVAL_MS);
    }
  }

  return true;
}

type UserType = {
  name: string;
  image_url: string;
};

// core-apiserverへの疎通確認用fetch。
// 接続自体に失敗した場合（サーバー未起動など）はBackendUnavailableErrorに変換する。
async function fetchBackend(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    console.error("Failed to reach backend:", error);
    throw new BackendUnavailableError();
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        callbackUrl: { label: "callbackUrl", type: "text" },
        idToken: { label: "idToken", type: "text" },
        csrfToken: { label: "csrfToken", type: "text" },
      },
      async authorize(credentials) {
        const { idToken }: Credential = credentials;
        if (!idToken) {
          return null;
        }

        const firebaseAdmin = getFirebaseAdmin();

        let decoded: DecodedIdToken;
        try {
          decoded = await firebaseAdmin.auth().verifyIdToken(String(idToken), true);
        } catch (error) {
          console.error("Failed to verify ID token:", error);
          return null;
        }

        /*
          ユーザを登録する処理
        */
        const user = { id: decoded.uid };

        try {
          // ユーザが既に登録されているか確認
          const domain = process.env.VSRECORDER_DOMAIN;
          const ret = await fetchBackend(`https://` + domain + `/api/v1beta/users/` + user.id, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          // ユーザが登録されていない場合は新規登録
          if (ret.status == 404) {
            const createUser: UserType = {
              name: decoded.name ?? "名称未設定",
              image_url:
                "https://xx8nnpgt.user.webaccel.jp/images/users/default_icon.png",
            };

            const jwtSecret = process.env.VSRECORDER_JWT_SECRET;
            if (!jwtSecret) {
              throw new Error("VSRECORDER_JWT_SECRET is not set");
            }

            const jwtSignOptions: jwt.SignOptions = {
              algorithm: "HS256",
              expiresIn: "10s",
            };

            const jwtPayload = {
              iss: "vsrecorder-webapp",
              uid: user.id,
            };

            const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

            // ユーザを登録
            const ret = await fetchBackend(`https://` + domain + `/api/v1beta/users`, {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(createUser),
            });

            if (ret.status === 201) {
              // 新規登録成功: firebaseユーザの画像を初期化
              // 失敗してもユーザ登録自体は完了しているためログインは継続する
              try {
                await firebaseAdmin.auth().updateUser(user.id, {
                  photoURL: "https://xx8nnpgt.user.webaccel.jp/images/users/default_icon.png",
                });
              } catch (error) {
                console.error("Failed to update firebase user photoURL:", error);
              }
            } else if (ret.status === 409) {
              // 同時ログインなどの競合により、別リクエストが先に登録済み。
              // ユーザ自体は正常に存在するためエラー扱いにしない。
              console.warn("User was already registered by a concurrent request:", user.id);
            } else {
              // 本当に登録に失敗した場合のみfirebaseユーザを削除してロールバック
              try {
                await firebaseAdmin.auth().deleteUser(user.id);
              } catch (error) {
                console.error("Failed to delete firebase user:", error);
              }
              console.error("Failed to create user");
              return null;
            }
          } else if (ret.status != 200) {
            console.error("Unexpected status from user API:", ret.status);
            return null;
          }

          return user;
        } catch (error) {
          if (error instanceof BackendUnavailableError) {
            throw error;
          }
          console.error("Failed to authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.userCheckedAt = Date.now();
        return token;
      }

      // 一定時間ごとにユーザーが退会済みでないかバックエンドに確認する。
      // 退会済みだった場合はnullを返してセッションを無効化し、
      // 他端末で退会した際にログイン済み状態が残り続けるのを防ぐ。
      const isCacheExpired =
        Date.now() - (token.userCheckedAt ?? 0) > USER_CHECK_CACHE_MS;

      if (isCacheExpired && token.uid) {
        try {
          const domain = process.env.VSRECORDER_DOMAIN;
          if (await isUserDeletedOnBackend(domain!, token.uid)) {
            return null;
          }

          token.userCheckedAt = Date.now();
        } catch (error) {
          // バックエンドへの疎通エラー時はセッションを維持する（フェイルオープン）
          console.error("Failed to verify user existence:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user ?? {}),
        id: token.uid ?? "",
      };

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60,
  },
  pages: {
    error: "/auth/error",
  },
  useSecureCookies: true,
});
