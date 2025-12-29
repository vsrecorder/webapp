import NextAuth from "next-auth";
import "next-auth/jwt";

import * as jwt from "jsonwebtoken";

import Credentials from "next-auth/providers/credentials";

import { getFirebaseAdmin } from "@firebase/admin";

import type { DecodedIdToken } from "firebase-admin/auth";

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
  }
}

type UserType = {
  name: string;
  image_url: string;
};

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
          decoded = await firebaseAdmin.auth().verifyIdToken(String(idToken));
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
          const ret = await fetch(`https://` + domain + `/api/v1beta/users/` + user.id, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          // ユーザが登録されていない場合は新規登録
          if (ret.status == 404) {
            // firebaseユーザの画像を初期化
            const createUser: UserType = {
              name: decoded.name,
              image_url:
                "https://xx8nnpgt.user.webaccel.jp/images/users/default_icon.png",
            };

            const jwtSecret: jwt.Secret = process.env.VSRECORDER_JWT_SECRET as string;

            const jwtSignOptions: jwt.SignOptions = {
              algorithm: "HS256",
              expiresIn: "10s",
            };

            const jwtPayload = {
              iss: "vsrecorder-web",
              uid: user.id,
            };

            const token = jwt.sign(jwtPayload, jwtSecret, jwtSignOptions);

            // ユーザを登録
            //
            await firebaseAdmin.auth().updateUser(user.id, {
              photoURL: "https://xx8nnpgt.user.webaccel.jp/images/users/default_icon.png",
            });

            const ret = await fetch(`https://` + domain + `/api/v1beta/users`, {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(createUser),
            });

            // ユーザ登録に失敗したらfirebaseユーザを削除
            if (ret.status !== 201) {
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
  useSecureCookies: true,
});
