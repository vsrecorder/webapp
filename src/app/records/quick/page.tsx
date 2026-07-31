import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateQuickRecordCreate from "@app/components/templates/QuickRecordCreate";
import { DeckData } from "@app/types/deck";
import { isEnvReturnEnabled } from "@app/utils/featureFlags";
import { upstreamUrl } from "@app/utils/upstream";

import * as jwt from "jsonwebtoken";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
    deck_code_id?: string;
    deck_name?: string;
  }>;
};

// 「使用デッキ」の選択肢を先に取ってから描画する。クライアントで取りに行くと、
// デッキを持つユーザーでは欄が後から現れる(ポップイン)ため、初回描画に間に合わせる。
// upstream の /decks/all はアーカイブ済みを除外し、作成日の新しい順で返す。
//
// 一覧はトークンの uid 基準(要認証)のため、webapp の /api routes と同じ方式で
// 短命 JWT を署名して呼ぶ。直前に作ったデッキを必ず含めたいのでキャッシュしない。
// 失敗時は null を返し、クライアント側の取得に委ねる(「デッキ0件」と区別する)。
async function getDecks(userId: string): Promise<DeckData[] | null> {
  const jwtSecret = process.env.VSRECORDER_JWT_SECRET as jwt.Secret;
  const token = jwt.sign({ iss: "vsrecorder-webapp", uid: userId }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: "10s",
  });

  const res = await fetch(upstreamUrl`/api/v1beta/decks/all`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (res.status !== 200) return null;

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// 施策A-3: 記録＋対戦を1画面で入力する簡素化フォームのページ。
// 施策A-2 クイックスタートからは deck_id / deck_code_id / deck_name を引き継いで
// 「使用デッキ選択済み」の状態で開く。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const [{ deck_id, deck_code_id, deck_name }, decks] = await Promise.all([
    searchParams,
    getDecks(session.user.id).catch(() => null),
  ]);

  return (
    <TemplateQuickRecordCreate
      deckId={deck_id ?? ""}
      deckCodeId={deck_code_id ?? ""}
      deckName={deck_name ?? ""}
      initialDecks={decks ?? undefined}
      envReturnEnabled={isEnvReturnEnabled()}
    />
  );
}
