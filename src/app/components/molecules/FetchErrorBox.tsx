"use client";

import FetchError from "@app/components/molecules/FetchError";

type Common = {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  className?: string;
  variant?: "card" | "row" | "stack";
};

type Props = Common & {
  /*
   * 高さの型枠。その場所に正常時(または読み込み中)に出るものを、そのまま渡す。
   * 描画はするが目には見せず、寸法を作るためだけに使う。
   * 呼び出し側で失敗を判定して、この形で使う。
   */
  sizer?: React.ReactNode;
  /*
   * 正常時の中身。失敗したかどうかは failed で渡す。
   * 正常時はそのまま描き、失敗時はそれを型枠にしてエラーを重ねる。
   * 骨格ではなく実体に高さを合わせたい場所(数値の行など)で使う。
   */
  children?: React.ReactNode;
  failed?: boolean;
};

/*
 * 取得に失敗したことを、正常時とまったく同じ高さで出すためのラッパー。
 *
 * エラーカードは中身(アイコン・文・ボタン)なりの高さしか持たないため、そのまま置くと
 * 正常時との差でカードが縮み、下に続くものがずれる(実測で 11〜500px)。固定値を書くと
 * 中身の変更に追随できないので、骨格や実体を型枠として敷き、その上にエラーを重ねる。
 * 高さはいつでも型枠そのものになり、幅や端末差にもそのまま追随する。
 *
 * 型枠が低くて縦積み(約138px)が入らない場所は variant="row" か "stack"(約70px)にする。
 */
export default function FetchErrorBox({
  sizer,
  children,
  failed,
  className = "",
  ...rest
}: Props) {
  // sizer を渡す形は「呼び出し側がすでに失敗と判定している」
  const showError = sizer !== undefined ? true : !!failed;

  if (!showError) return <>{children}</>;

  /*
   * 重ね方は grid(同じセルに2つ置く)。absolute で重ねると、型枠より中身が高い場所
   * (前回0件だった枠など)でエラーカードが枠の外へはみ出す。grid なら行の高さが
   * 両者の高いほうになるので、揃えられるときは揃い、入らないときも崩れない。
   * 列は grid-cols-1 で明示する。暗黙の列(auto)は中身しだいで幅が変わり、
   * 幅で高さが決まる型枠(バッジの並びなど)が実測で 82px 縮んだ。
   */
  return (
    <div className="grid w-full grid-cols-1">
      {/* 寸法だけを借りる。読み上げ・操作からは外す */}
      {/* self-start で引き伸ばしを止める。grid の子は既定で行の高さまで伸ばされ、
          中に高さが親に依る部分があると型枠のほうが縮んでしまう(実測で 82px) */}
      <div aria-hidden className="invisible col-start-1 row-start-1 self-start" inert>
        {sizer ?? children}
      </div>

      <div className="col-start-1 row-start-1">
        <FetchError {...rest} className={`h-full ${className}`} />
      </div>
    </div>
  );
}
