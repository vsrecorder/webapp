import { ReactNode } from "react";
import { Card, CardBody } from "@heroui/react";

/*
 * 文字の行の骨格。実体と同じ文字クラス・同じ(か代表の)文言を透明な文字で流し込み、
 * 文字の背景をバーとして光らせる。
 *
 * このカードは文言が長く、画面幅やフォント(端末ごとに違う)で折り返す行数が変わる
 * (補足の行は幅 375px 以下で2行、320px では見出し・環境の行も折り返す)。
 * 固定の幅・行数のバーでは追従できないので、折り返しはブラウザに実体と同じ計算をさせる。
 * box-decoration-clone で、折り返した各行の端にも角丸が付く。
 */
function SkeletonText({
  className,
  barClassName,
  children,
}: {
  className: string;
  barClassName: string;
  children: ReactNode;
}) {
  return (
    <span aria-hidden className={`block select-none ${className}`}>
      <span
        className={`text-transparent box-decoration-clone rounded-md animate-pulse ${barClassName}`}
      >
        {children}
      </span>
    </span>
  );
}

// 「おかえり」カード(施策D-4)の骨格。
// 実体は取得を伴わない静的なカードだが、骨格として描くと表示回数の計測が二重に飛ぶため、
// 同じ寸法の骨格をここに別途持つ(FirstRecordCtaCardSkeleton と同じ事情)。
// 末尾のレポートへのリンクの有無は、前回描いたほうのブロックID(winback / winback_with_report)で選ぶ。
// 環境名などの可変部分は文字数の近い代表の文言で置き換えている。
export default function WinbackCardSkeleton({ withReport = false }: { withReport?: boolean }) {
  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardBody className="p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          {/* 「おかえりなさい」と右端の ×。× は Button size="sm"(32px)だが -mt-1 で
              行の高さは 28px になる */}
          <div className="h-7 flex items-center justify-between">
            <div className="h-2.5 w-24 rounded-full bg-primary/20 animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-default-100 animate-pulse" />
          </div>
          {/* 見出し(text-lg)。「（◯週間ぶり）」は必ず2行目に送られる */}
          <SkeletonText className="text-lg font-bold" barClassName="bg-primary/20">
            最後の対戦は 10/19〜10/25 の週
            <br />
            （5週間ぶり）
          </SkeletonText>
          {/* 環境の行(text-sm) */}
          <SkeletonText className="text-sm" barClassName="bg-default-200">
            いまは『〇〇〇〇〇〇〇』環境です（11/27〜）
          </SkeletonText>
        </div>
        <div className="flex flex-col gap-2">
          {/* ボタン(Button size="lg" = 48px)。狭い画面では幅いっぱい */}
          <div className="h-12 w-full sm:w-56 rounded-full bg-primary/20 animate-pulse" />
          {/* 補足の行(text-xs)。固定の文言なので実体と同じ文字で折り返させる */}
          <SkeletonText className="text-xs" barClassName="bg-default-200">
            休んでいた間の大会も、日付を選んであとから記録できます
          </SkeletonText>
        </div>
        {withReport && (
          // レポートへのリンク(text-sm + 16px のアイコン)
          <span aria-hidden className="inline-flex items-center gap-1 text-sm font-bold self-start select-none">
            <span className="text-transparent box-decoration-clone rounded-md animate-pulse bg-primary/20">
              『〇〇〇〇〇〇〇〇〇』のバトルレポート
            </span>
            <span className="w-4 h-4 shrink-0" />
          </span>
        )}
      </CardBody>
    </Card>
  );
}
