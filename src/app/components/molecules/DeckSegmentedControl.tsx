"use client";

import { useRouter } from "next/navigation";

import { Tab, Tabs } from "@heroui/react";

import { sharedDecksPath } from "@app/utils/deckCodePost";

type Props = {
  // いま開いている側
  selected: "mine" | "shared";
  // 閲覧者がログイン済みか(未ログインなら「マイデッキ」に鍵を付け、押すとログイン案内)。
  // ID そのものは使わないので真偽値で受ける。読み込み中(loading.tsx)からも
  // セッション Cookie の有無だけで同じ見た目を出せるようにするため
  isLoggedIn: boolean;
  // 未ログインで「マイデッキ」を押したとき
  onRequireLogin?: () => void;
};

/*
 * 「マイデッキ｜みんなの公開デッキ」の切り替え。デッキ一覧(/decks)とみんなの公開デッキ(/shared_decks)の
 * 両方で、ヘッダ直下に固定して常に出す(デッキが1つも無いときも隠さない)。
 *
 * 見た目はデッキ一覧の「利用中／アーカイブ済み」タブと同じ部品で揃え、色だけ変えて
 * 「上段＝どちらのデッキか、下段＝マイデッキの中の絞り込み」と読めるようにする。
 * 高さは 2.5rem(タブ h-8 ＋ 余白)。下に別の固定バーを置くときはこの分ずらす。
 *
 * 両ページの loading.tsx も骨格ではなくこれを直接描く。タブの見た目はデータに依存しないので、
 * 骨格に差し替えると「タブを押す→ラベルと選択位置が一瞬グレーの棒になって戻る」だけの
 * ちらつきになる(実測で約400ms)。読み込み中もそのまま出しておけば、押したタブが
 * すぐ選択状態になり、切り替わったのは下の一覧だけに見える。
 */
export default function DeckSegmentedControl({ selected, isLoggedIn, onRequireLogin }: Props) {
  const router = useRouter();

  return (
    <Tabs
      fullWidth
      size="md"
      aria-label="マイデッキとみんなの公開デッキの切り替え"
      selectedKey={selected}
      onSelectionChange={(key) => {
        if (key === selected) return;

        if (key === "mine") {
          if (!isLoggedIn) {
            onRequireLogin?.();
            return;
          }
          router.push("/decks");
          return;
        }

        router.push(sharedDecksPath);
      }}
      // 背景が固定のパステル色のため、ダークモードでも文字色などを
      // ライトモードの見た目に固定する（light クラスでテーマをライトに再スコープ）
      // 左端はサイドバーの幅(--sidebar-width。Layout がログイン時の PC 幅でだけ 14rem にする)。
      // 未ログインで見るみんなの公開デッキにはサイドバーが無いので、固定の lg:left-56 だと右へずれる
      className="light fixed z-50 top-15 left-(--sidebar-width) right-0 pl-1 pr-1"
      classNames={{
        cursor: "bg-blue-200",
        tab: "h-8",
        tabList: "bg-blue-100",
        tabContent: "font-bold",
      }}
    >
      <Tab key="mine" title={isLoggedIn ? "マイデッキ" : "🔒 マイデッキ"} />
      <Tab key="shared" title="みんなの公開デッキ" />
    </Tabs>
  );
}
