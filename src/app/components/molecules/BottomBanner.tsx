"use client";

import DismissBadgeButton from "@app/components/atoms/DismissBadgeButton";

/*
 * 画面下に浮かせる帯の共通の器。
 *
 * 登録時アンケート・ホーム画面に追加・通知の許諾・記録中の4枚が同じ位置に出るので、
 * 幅・角丸・面・影・閉じるボタンをここで一本化する。中身だけを各自が持つ。
 *
 * 同時に2枚は出さない(どれを出すかは PwaBanners が決める)。重ねると下の帯が読めなくなる。
 *
 * 面を透かさないのは、ここが文字と数字を読ませる場所だから。下部ナビはアイコンと
 * ラベルだけなので半透明でも読めるが、こちらは後ろのコンテンツが透けると途端に読めない。
 */

type Props = {
  children: React.ReactNode;
  // 何を閉じるのかが分かる文言(「バナーを閉じる」など)
  dismissLabel: string;
  onDismiss: () => void;
  /*
   * デスクトップ幅(lg 以上)でも出すか。既定は出さない(下部ナビの上に重ねる前提の
   * 見た目で、広い画面では作業領域を覆う異物になる)。出す場合は右下へ寄せる。
   */
  desktop?: boolean;
};

export default function BottomBanner({
  children,
  dismissLabel,
  onDismiss,
  desktop = false,
}: Props) {
  return (
    /*
     * 外枠は場所を決めるだけ。角丸・枠線・面は内側が持つ。
     *
     * 分けているのは、閉じるボタンが角から外へはみ出すため。角丸を外枠に持たせると
     * 中身を切る(overflow-hidden)ためにボタンまで欠け、切らなければ中身(記録中バーの
     * 左端のアクセント)が角からはみ出して枠線と合わなくなる。
     */
    <div
      className={`fixed z-50 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] left-2 right-2 ${
        desktop ? "lg:bottom-6 lg:left-auto lg:right-6 lg:w-[26rem]" : ""
      }`}
    >
      <DismissBadgeButton label={dismissLabel} onPress={onDismiss} />

      <div className="overflow-hidden rounded-2xl border border-divider bg-content1 shadow-xl">
        {children}
      </div>
    </div>
  );
}
