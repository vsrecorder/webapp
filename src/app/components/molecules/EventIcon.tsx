import { LuPencilLine } from "react-icons/lu";

/*
 * イベント種別ごとの印。対戦記録カード(RecordCardBase に各種別が渡しているもの)と
 * 同じ見た目にする。ホームの「記録中」カードと画面下のバーで共有する。
 */

export type EventKind = "official" | "tonamel" | "unofficial";

type Props = {
  kind: EventKind;
  // 公式イベントのアイコン画像。取得に失敗していれば null
  iconUrl: string | null;
  // 画像の大きさ(px)。枠は呼び出し側が持つ
  size?: number;
};

export default function EventIcon({ kind, iconUrl, size = 28 }: Props) {
  if (iconUrl) {
    /*
     * HeroUI の Image は、キャッシュ済みの画像で読み込み完了を取りこぼすと
     * opacity:0 のまま出てこないことがある(スプライト・デッキ画像も同じ理由で
     * 素の img にしてある)。ここも素の img を使う。
     */
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt="" width={size} height={size} className="object-contain" />;
  }

  if (kind === "tonamel") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-orange-500">
        <span className="text-sm font-black text-white">T</span>
      </div>
    );
  }

  if (kind === "unofficial") {
    return <LuPencilLine className="text-default-500" size={size * 0.7} />;
  }

  /*
   * 公式イベントなのにアイコンのURLが無い = イベントの取得に失敗したとき。
   * ここで自由形式の鉛筆を出すと種別を誤って伝えるので、枠だけ残して何も描かない。
   */
  return null;
}
