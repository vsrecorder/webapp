import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateQuickRecordCreate from "@app/components/templates/QuickRecordCreate";
import { DeckData } from "@app/types/deck";
import { RecordGetResponseType } from "@app/types/record";
import { isEnvReturnEnabled } from "@app/utils/featureFlags";
import { upstreamUrl } from "@app/utils/upstream";
import { signUpstreamToken } from "@app/utils/upstreamToken";

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
  const token = signUpstreamToken(userId);

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

// 対戦記録が1件でもあるかを判定する。
// 「最初の1件」を作るための簡素化フォームなので、既に記録があるユーザーは対象外。
//
// 注意: user_stat の total_records は使えない。`/users/:id/stats` はクエリ無しだと
// 「当月」の集計を返すため（全期間ではない）、月初に履歴のあるユーザーを 0 件と誤判定する。
// records 一覧を limit=1 で引き、返ってきた件数で判定する（Dashboard.tsx と同じ方式）。
//
// 一覧はトークンの uid 基準（要認証）のため、webapp の /api routes と同じ方式で短命 JWT を
// 署名して呼ぶ。直前に作った記録も必ず数えたいのでキャッシュしない。
// 失敗時は null を返し、呼び出し側は「リダイレクトしない」側に倒す
// （このページは記録0件ユーザーがW0＝最初の1件へ到達する主導線であり、
// 判定できないことを理由に塞ぐ損失のほうが、簡素化フォームを使えてしまう損失より大きい）。
async function hasAnyRecord(userId: string): Promise<boolean | null> {
  const token = signUpstreamToken(userId);

  const res = await fetch(upstreamUrl`/api/v1beta/records?limit=1`, {
    cache: "no-store",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
  });

  if (res.status !== 200) return null;

  const data: RecordGetResponseType = await res.json();
  return data.records.length > 0;
}

// 施策A-3: 記録＋対戦を1画面で入力する簡素化フォームのページ。
// 施策A-2 クイックスタートからは deck_id / deck_code_id / deck_name を引き継いで
// 「使用デッキ選択済み」の状態で開く。
//
// このフォームは「最初の1件」専用。記録が1件でもあるユーザーが直接URLで開いた場合は
// 通常の記録作成(/records/create)へ送る（デッキコードのクイックスタートは記録の有無に
// 関わらずこのURLへ push するため、その経路もここで受けてリダイレクトされる）。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  // decks はリダイレクトしない場合にだけ必要だが、記録件数の判定を待ってから取りに行くと
  // 往復が直列になり、本来の対象である記録0件ユーザーの初回描画が遅くなる。
  // 先に走らせておき、リダイレクトする場合は待たずに捨てる。
  const decksPromise = getDecks(session.user.id).catch(() => null);

  const [{ deck_id, deck_code_id, deck_name }, hasRecord] = await Promise.all([
    searchParams,
    hasAnyRecord(session.user.id).catch(() => null),
  ]);

  if (hasRecord) {
    // 使用デッキの引き継ぎは deck_id / deck_code_id のみ。
    // /records/create はこの2つを読んで使用デッキをプリセットし、deck_name は使わない。
    const params = new URLSearchParams();
    if (deck_id) params.set("deck_id", deck_id);
    if (deck_code_id) params.set("deck_code_id", deck_code_id);

    const query = params.toString();
    redirect(query ? `/records/create?${query}` : "/records/create");
  }

  const decks = await decksPromise;

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
