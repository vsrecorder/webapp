"use client";

import SegmentedButtons from "@app/components/molecules/SegmentedButtons";

type DeckStatus = "inuse" | "archived";

type Props = {
  value: DeckStatus;
  onChange: (value: DeckStatus) => void;
};

const OPTIONS = [
  { key: "inuse", label: "利用中" },
  { key: "archived", label: "アーカイブ済み" },
] as const;

/*
 * デッキ一覧の「利用中／アーカイブ済み」の切り替え。
 *
 * 以前は画面上部の固定タブだったが、上段に「マイデッキ｜みんなの公開デッキ」の
 * セグメントを常時出すようになり、タブ・表示切替と合わせて固定バーが3段重なって
 * 見えていた。そこで固定タブをやめ、リスト／ギャラリーの表示切替と同じ行の左側に
 * 収まるピル型(SegmentedButtons)にして、固定バーを2段に減らしている。
 */
export default function DeckStatusToggle({ value, onChange }: Props) {
  // 色は以前の固定タブと同じ。利用中を選ぶと緑のつまみに赤い地、アーカイブ済みを選ぶと
  // 赤いつまみに緑の地になり、「もう一方へ移る」ことが色でも分かるようにしている。
  // 背景が固定のパステル色のため、ダークモードでも文字色をライトモードの見た目に固定する
  // (light クラスでテーマをライトに再スコープ。固定タブだったときと同じ扱い)。
  const trackClassName = value === "inuse" ? "bg-red-100" : "bg-green-100";
  const selectedClassName = `${value === "inuse" ? "bg-green-200" : "bg-red-200"} text-foreground shadow-sm`;

  return (
    <SegmentedButtons
      options={OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="デッキの状態"
      role="radiogroup"
      trackClassName={trackClassName}
      selectedClassName={selectedClassName}
      className="light"
    />
  );
}
