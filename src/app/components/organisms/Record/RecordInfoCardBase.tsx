import { Card, CardBody } from "@heroui/react";

import { LuCalendar } from "react-icons/lu";

export type RecordInfoMetaRow = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
};

type Props = {
  // ヒーローアイコン枠(56x56)の背景。種別/ブランドごとに変える
  iconBoxClassName?: string;
  // ヒーローアイコンの中身(種別アイコン画像 / ブランドマーク / 記号)
  icon: React.ReactNode;
  // 種別/ブランドチップ(複数可)
  chips: React.ReactNode;
  // イベント名
  title: string;
  // 開催日(整形済み文字列)
  date: string;
  // 右上アクション(外部リンク/編集など)。無いカードは省略
  action?: React.ReactNode;
  // ヘッダー下に差し込む大きめビジュアル(Tonamelバナーなど)。任意
  heroMedia?: React.ReactNode;
  // ラベル付きメタ情報行
  metaRows: RecordInfoMetaRow[];
};

/*
 * 公式/Tonamel/自由形式の詳細(Info)カードで共有するヒーローヘッダー型レイアウト。
 * 「ヒーローアイコン + チップ + イベント名 + 開催日」を主役とし、
 * その下にラベル付きメタ情報を整理して並べる。差分のみ props で受け取る。
 */
export default function RecordInfoCardBase({
  iconBoxClassName = "bg-default-100",
  icon,
  chips,
  title,
  date,
  action,
  heroMedia,
  metaRows,
}: Props) {
  return (
    <Card shadow="sm" className="w-full overflow-hidden">
      <CardBody className="p-0">
        {/* ヒーローヘッダー(縦積み・中央寄せ) */}
        <div className="relative flex flex-col items-center text-center gap-3 px-5 pt-6 pb-5">
          {/* 右上アクション(中央寄せレイアウトのため絶対配置) */}
          {action && <div className="absolute right-2.5 top-2.5">{action}</div>}

          {/* ヒーローアイコン(画像と文字のバランスを取るため少し大きめに) */}
          <div
            className={`w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-inset ring-black/5 ${iconBoxClassName}`}
          >
            {icon}
          </div>

          {/* 開催日・タイトル・チップ */}
          <div className="flex flex-col items-center gap-2 min-w-0 w-full">
            <div className="flex items-center gap-1.5 text-xs font-medium text-default-500">
              <LuCalendar className="w-3.5 h-3.5 shrink-0" />
              <span>{date}</span>
            </div>
            <h3 className="font-bold text-lg leading-snug wrap-break-word">{title}</h3>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {chips}
            </div>
          </div>
        </div>

        {/* ヒーローメディア(Tonamelバナー等) */}
        {heroMedia && <div className="px-5 pb-5">{heroMedia}</div>}

        {/* メタ情報(ラベル付き行) */}
        {metaRows.length > 0 && (
          <div className="border-t border-divider px-5 py-4 flex flex-col gap-3">
            {metaRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2.5 min-w-0">
                <span className="text-default-400 shrink-0 flex">{row.icon}</span>
                <span className="text-xs text-default-400 w-12 shrink-0">
                  {row.label}
                </span>
                <div className="text-sm text-default-700 truncate min-w-0 flex-1">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
