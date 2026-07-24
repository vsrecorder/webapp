"use client";

import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";
import { LuFilePen } from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckEnvPosition } from "@app/utils/deckEnv";

// 施策E-1: クイック記録の保存直後に、下からせり上がるシート。相手デッキの環境的な位置
// (順位・使用率・全体勝率)と勝敗の意味づけを返し、「統計的に無意味な1戦」を「意味のある1戦」に変える。
// position が null のときは「先週は環境ランキング外」の相手として表示する(親は「先週の対戦環境データが
// あり、かつ相手にスプライトあり」で開く)。集合データで価値を前倒しする狙い(blindspots §2)。

type CtaConfig = { label: string; onPress: () => void };

type Props = {
  isOpen: boolean;
  // 完了の合図(チップ)に出す文言。例: "記録できました" / "対戦結果を追加しました"
  savedLabel: string;
  opponentName: string;
  opponentSprites: MatchPokemonSpriteType[];
  position: DeckEnvPosition | null; // null = 先週の環境ランキング外
  victory: boolean;
  // CTA はフローごとに差し替える(クイック記録=記録を見る/続けて追加、通常追加=続けて追加/閉じる)。
  primaryCta: CtaConfig;
  secondaryCta?: CtaConfig;
};

export default function EnvironmentReturnModal({
  isOpen,
  savedLabel,
  opponentName,
  opponentSprites,
  position,
  victory,
  primaryCta,
  secondaryCta,
}: Props) {
  const ranked = position != null;
  const rank = position?.rank ?? null;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  const topTier = rank != null && rank <= 3;
  // 使用率は E-2 と同じ「その他を除いた割合」で表示する。
  const usageRate =
    position && position.exclOtherTotal > 0
      ? position.row.count / position.exclOtherTotal
      : null;

  // 勝敗の意味づけ。負けは煽らず健闘を肯定する(きずなの逆境思想・KIZUNA_ALGORITHM.md)。
  const verdictIcon = victory ? "🎉" : "🛡️";
  const verdictMsg = victory
    ? topTier
      ? "環境トップクラスの相手に勝てたのは大きい！"
      : ranked
        ? "環境で戦われている相手に勝てました！"
        : "その相手に勝てました！"
    : topTier
      ? "環境トップクラスの難敵。よく戦いました。"
      : ranked
        ? "手強い相手でした。よく戦いました。"
        : "よく戦いました。";

  return (
    <Modal
      isOpen={isOpen}
      placement="bottom"
      size="md"
      hideCloseButton
      isDismissable={false}
      isKeyboardDismissDisabled
    >
      <ModalContent>
        <ModalBody className="gap-4 px-5 py-6">
          {/* 見出し + 保存できた合図(この演出自体が完了通知なので別途トーストは出さない) */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-bold tracking-tight">
                対戦環境の中の重要な1戦
              </span>
              <span className="text-[10px] text-default-400 leading-none">
                先週の対戦環境データより
              </span>
            </div>
            <span className="text-[10.5px] font-bold text-success-600 rounded-full bg-success/15 px-2.5 py-1 whitespace-nowrap shrink-0">
              ✓ {savedLabel}
            </span>
          </div>

          {/* 相手デッキ */}
          <div className="flex flex-col gap-3.5 rounded-2xl bg-default-50 border border-default-100 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-0 shrink-0">
                {([1, 2] as const).map((slot) => (
                  <PokemonSprite
                    key={slot}
                    id={getDeckSpriteBySlot(opponentSprites, slot)?.id}
                    size={40}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-wide text-default-400">
                  対戦相手のデッキ
                </div>
                <div className="text-base font-bold leading-tight truncate mt-0.5">
                  {opponentName}
                </div>
              </div>
            </div>

            {position ? (
              <div className="grid grid-cols-3">
                <div className="flex flex-col gap-1 px-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-default-400">環境順位</span>
                  <span className="text-[17px] font-black tabular-nums leading-none whitespace-nowrap">
                    {medal && <span className="mr-0.5">{medal}</span>}
                    {rank}位
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                  <span className="text-[10px] font-bold text-default-400">使用率</span>
                  <span className="text-[17px] font-black tabular-nums leading-none">
                    {((usageRate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                  <span className="text-[10px] font-bold text-default-400">全体勝率</span>
                  <span className="text-[17px] font-black tabular-nums leading-none">
                    {(position.row.win_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              // 先週の環境ランキング外(出現数が少ない)。順位・勝率は出せないため、その旨を伝える。
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-black text-default-600">
                  先週は環境ランキング外
                </span>
                <span className="text-[11px] text-default-400 leading-snug">
                  先週の出現が少ない、珍しい相手です
                </span>
              </div>
            )}
          </div>

          {/* 勝敗の意味づけ */}
          <div
            className={`flex items-center gap-3 rounded-2xl p-3.5 ${
              victory ? "bg-success/12" : "bg-warning/12"
            }`}
          >
            <span
              className={`grid place-items-center w-9 h-9 rounded-xl text-xl shrink-0 ${
                victory ? "bg-success/20" : "bg-warning/25"
              }`}
            >
              {verdictIcon}
            </span>
            <span
              className={`text-[13.5px] font-bold leading-snug ${
                victory ? "text-success-600" : "text-warning-700"
              }`}
            >
              {verdictMsg}
            </span>
          </div>

          {/* 次への一言 */}
          <p className="text-[11.5px] leading-relaxed text-default-500 text-center px-1">
            記録を続けることで、対戦相手のデッキとの
            <br />
            <span className="font-bold text-default-700">
              「あなたのデッキとの間の勝率」
            </span>
            が見え始めます。
          </p>

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <Button
              color="primary"
              radius="lg"
              className="font-bold h-12 shadow-md"
              startContent={<LuFilePen className="w-4 h-4" />}
              onPress={primaryCta.onPress}
            >
              {primaryCta.label}
            </Button>
            {secondaryCta && (
              <Button
                variant="light"
                radius="lg"
                className="font-bold text-default-500 h-10"
                onPress={secondaryCta.onPress}
              >
                {secondaryCta.label}
              </Button>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
