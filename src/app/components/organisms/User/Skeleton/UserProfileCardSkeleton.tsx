import { Card, CardBody } from "@heroui/react";

type Props = {
  isDevEnv?: boolean;
};

// UserProfileCard のスケルトン。
//
// 実カードは「グラデーションヘッダー(アバター・名前・プレイヤーズクラブ連携・勝率)＋
// 統計グリッド(試合数・勝利・敗北)」という2段構成なので、同じ骨格・同じ余白で組む。
// 各ブロックの高さは実カードの行ボックス(ブラウザで実測した値)に合わせてあり、
// スケルトンから実カードに入れ替わってもカードの高さが変わらない。
//
// プレースホルダは HeroUI の Skeleton ではなく、実カードが読み込み中に出すもの
// (プレイヤーズクラブ連携のバッジ)と同じ「半透明ブロック + animate-pulse」で揃えている。
// Skeleton だとヘッダーではグラデーションの上に default 色のシマーが浮き、統計グリッドでは
// ダークテーマのときチップの背景(bg-default-100)とほぼ同色になって見えなくなるため。
export default function UserProfileCardSkeleton({ isDevEnv = false }: Props) {
  return (
    <Card className="overflow-hidden shadow-md">
      {/* グラデーションヘッダー（dev環境の色分けも実カードに合わせる） */}
      <div
        className={`px-3 pt-4 pb-5 flex items-center gap-3.5 ${
          isDevEnv
            ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
            : "bg-linear-to-br from-primary via-primary to-secondary"
        }`}
      >
        {/* アバター（Avatar size="lg" = 56px。リングも実カードと同じ指定にする） */}
        <div className="w-14 h-14 shrink-0 rounded-full bg-white/25 ring-offset-2 ring-offset-background ring-2 ring-white/40 animate-pulse" />

        <div className="min-w-0 flex flex-col gap-1">
          {/* ユーザー名（text-base leading-tight の1行 = 20px） */}
          <div className="h-5 flex items-center">
            <div className="h-4 w-32 rounded-md bg-white/25 animate-pulse" />
          </div>
          {/* プレイヤーズクラブ連携（実カードの読み込み中と同じプレースホルダ） */}
          <div className="w-28 h-3 rounded-full bg-white/20 animate-pulse" />
        </div>

        <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5">
          {/* 年月セレクト（18px の行） */}
          <div className="h-4.5 flex items-center">
            <div className="h-3.5 w-20 rounded-md bg-white/20 animate-pulse" />
          </div>
          {/* WIN RATE ラベル（13.5px の行 + pb-1） */}
          <div className="h-[17.5px] flex items-center pb-1">
            <div className="h-[13.5px] w-16 rounded-md bg-white/20 animate-pulse" />
          </div>
          {/* 勝率（text-3xl leading-none = 30px の行 + pb-0.5） */}
          <div className="h-8.5 flex items-center pb-0.5">
            <div className="h-6 w-18 rounded-lg bg-white/25 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 統計グリッド */}
      <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
        <div className="grid grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-default-100"
            >
              {/* アイコン(14px) / 数値(text-lg leading-none = 18px) / ラベル(9px の行 = 13.5px) */}
              <div className="w-3.5 h-3.5 rounded-sm bg-default-300 animate-pulse" />
              <div className="h-4.5 w-10 rounded-md bg-default-300 animate-pulse" />
              <div className="h-[13.5px] w-9 rounded-md bg-default-300 animate-pulse" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
