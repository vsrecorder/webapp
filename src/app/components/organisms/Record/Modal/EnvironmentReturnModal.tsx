"use client";

import { ModalContent, ModalBody, Button } from "@heroui/react";
import { LuFilePen } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import { DeckEnvPosition, FirstSpriteEnvPosition } from "@app/utils/deckEnv";

// 施策E-1: クイック記録の保存直後に、下からせり上がるシート。相手デッキの環境的な位置
// (順位・使用率・全体勝率)と勝敗の意味づけを返し、「統計的に無意味な1戦」を「意味のある1戦」に変える。
// position が null のときは「先週は環境ランキング外」の相手として表示する(親は「先週の対戦環境データが
// あり、かつ相手にスプライトあり」で開く)。集合データで価値を前倒しする狙い(blindspots §2)。
// firstSprite があれば、1体目でまとめたときの順位・使用率・勝率と、その中での相手の組み合わせの
// 割合を補足として1段追加する(組み合わせ単位では圏外でも、系統としては環境上位のことがあるため)。

type CtaConfig = { label: string; onPress: () => void };

type Props = {
  isOpen: boolean;
  // 完了の合図(チップ)に出す文言。例: "記録できました" / "対戦結果を追加しました"
  savedLabel: string;
  opponentName: string;
  opponentSprites: MatchPokemonSpriteType[];
  position: DeckEnvPosition | null; // null = 先週の環境ランキング外
  firstSprite: FirstSpriteEnvPosition | null; // 1体目でまとめたときの立ち位置(圏外なら null)
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
  firstSprite,
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

  // 1体目でまとめた段。束ねた組み合わせが1通りだけだと上段と同じ数字になるため出さない。
  const firstMemberCount = firstSprite?.row.members?.length ?? 0;
  const showFirstSprite = firstSprite != null && firstMemberCount >= 2;
  const firstRank = showFirstSprite ? firstSprite.rank : null;
  const firstMedal =
    firstRank === 1 ? "🥇" : firstRank === 2 ? "🥈" : firstRank === 3 ? "🥉" : null;
  const firstUsageRate =
    firstSprite && firstSprite.exclOtherTotal > 0
      ? firstSprite.row.count / firstSprite.exclOtherTotal
      : null;
  // 1体目の内訳(件数の多い順)。相手の組み合わせの割合を帯で見せる。
  const firstMembers = [...(firstSprite?.row.members ?? [])].sort((a, b) => b.count - a.count);
  const memberShare =
    firstSprite?.member && firstSprite.row.count > 0
      ? firstSprite.member.count / firstSprite.row.count
      : null;
  // 組み合わせは圏外だが、1体目でまとめると環境3位以内=「珍しい型だが環境上位の系統」
  const topTierLineage = !ranked && firstRank != null && firstRank <= 3;

  // 勝敗の意味づけ。負けは煽らず健闘を肯定する(きずなの逆境思想・KIZUNA_ALGORITHM.md)。
  // 組み合わせの順位で判定し、圏外のときだけ1体目でまとめた順位で「環境上位の系統」に格上げする。
  // 改行(\n)は whitespace-pre-line で表示する。
  const verdictIcon = victory ? "🎉" : "🛡️";
  const verdictMsg = victory
    ? topTier
      ? "環境トップクラスの相手に勝てたのは大きい！"
      : ranked
        ? "環境で戦われている相手に勝てました！"
        : topTierLineage
          ? "環境上位の系統に勝てました！"
          : "その相手に勝てました！"
    : topTier
      ? "環境トップクラスの難敵。\nよく戦いました。"
      : ranked
        ? "手強い相手でした。よく戦いました。"
        : topTierLineage
          ? "環境上位の系統の難敵。よく戦いました。"
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
        <ModalBody className="gap-4 px-3 py-6">
          {/* 見出し + 保存できた合図(この演出自体が完了通知なので別途トーストは出さない) */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-bold tracking-tight">
                対戦環境の中の重要な1戦
              </span>
              <span className="text-[0.625rem] text-default-400 leading-none">
                先週の対戦環境データより
              </span>
            </div>
            <span className="text-[0.65625rem] font-bold text-success-600 rounded-full bg-success/15 px-2.5 py-1 whitespace-nowrap shrink-0">
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
                <div className="text-[0.625rem] font-bold tracking-wide text-default-400">
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
                  <span className="text-[0.625rem] font-bold text-default-400">環境順位</span>
                  <span className="text-[1.0625rem] font-black tabular-nums leading-none whitespace-nowrap">
                    {medal && <span className="mr-0.5">{medal}</span>}
                    {rank}位
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                  <span className="text-[0.625rem] font-bold text-default-400">使用率</span>
                  <span className="text-[1.0625rem] font-black tabular-nums leading-none">
                    {((usageRate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-3 border-l border-default-200 min-w-0">
                  <span className="text-[0.625rem] font-bold text-default-400">全体勝率</span>
                  <span className="text-[1.0625rem] font-black tabular-nums leading-none">
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
                <span className="text-[0.6875rem] text-default-400 leading-snug">
                  先週の出現が少ない、珍しい相手です
                </span>
              </div>
            )}

            {/* 1体目でまとめたときの立ち位置(補足) */}
            {showFirstSprite && (
              <div className="flex flex-col gap-2 border-t border-dashed border-default-300 pt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <PokemonSprite
                    id={firstSprite.row.pokemon_sprites[0]?.id}
                    size={40}
                    className="-my-1.5 -ml-1 shrink-0"
                  />
                  <span className="text-[0.625rem] font-bold text-default-500">
                    1体目でまとめると（{firstMemberCount}通りの組み合わせ）
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[0.625rem] font-bold text-default-400">順位</span>
                    <span className="text-[0.9375rem] font-black tabular-nums whitespace-nowrap">
                      {firstMedal && <span className="mr-0.5">{firstMedal}</span>}
                      {firstRank}位
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[0.625rem] font-bold text-default-400">使用率</span>
                    <span className="text-[0.9375rem] font-black tabular-nums text-secondary">
                      {((firstUsageRate ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[0.625rem] font-bold text-default-400">勝率</span>
                    <span className="text-[0.9375rem] font-black tabular-nums">
                      {(firstSprite.row.win_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                {memberShare != null && firstSprite.member && (
                  <>
                    {/* 内訳の帯: 相手の組み合わせを強調し、他の組み合わせはグレーで件数順に並べる */}
                    <div
                      className="flex h-[7px] gap-[1.5px] overflow-hidden rounded-full bg-default-100"
                      aria-hidden
                    >
                      {firstMembers.map((m) => (
                        <span
                          key={m.fingerprint}
                          className={
                            m.fingerprint === firstSprite.member?.fingerprint
                              ? "bg-secondary"
                              : "bg-default-300"
                          }
                          style={{ flexGrow: m.count, flexBasis: 0 }}
                        />
                      ))}
                    </div>
                    <span className="text-[0.6875rem] leading-snug text-default-500">
                      相手のデッキは1体目が同じデッキの
                      <span className="font-bold text-foreground">
                        {Math.round(memberShare * 100)}%
                      </span>
                      （{firstSprite.row.count}件中{firstSprite.member.count}件）。
                      {topTierLineage && (
                        <>
                          <br />
                          珍しい型ですが、系統としては環境上位です。
                        </>
                      )}
                    </span>
                  </>
                )}
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
              className={`text-[0.84375rem] font-bold leading-snug whitespace-pre-line ${
                victory ? "text-success-600" : "text-warning-700"
              }`}
            >
              {verdictMsg}
            </span>
          </div>

          {/* 次への一言 */}
          <p className="text-[0.71875rem] leading-relaxed text-default-500 text-center px-1">
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
