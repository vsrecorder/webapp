"use client";

import { useEffect, useRef } from "react";

import { Card, CardBody } from "@heroui/react";
import { LuGauge, LuCircleCheck } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

// このデッキの勝率が「参考になる」精度に達する暫定な対戦結果数（マジックナンバー）。
// ※ 単位は「対戦結果(対戦)」。記録(イベント)ではなく、記録内の各対戦の数で数える。
//   deck-usage の count = COUNT(DISTINCT matches.id) がこの値にあたる。
// ※ 継続者データ（対戦数分布・定着数）の分析で確定させるまでの暫定値。
//   きずな同様「暫定である旨」を画面にも明記して、後で較正する。
const MAGIC_DECK_MATCHES = 10;

// 勝ち越しライン（五分）。環境平均が引けないときの比較の錨に使う。
const BREAK_EVEN = 0.5;

// 勝率(0〜1)を小数点第1位まで、末尾".0"を落としてパーセント表記にする。
function formatPercent(rate: number): string {
  const s = (rate * 100).toFixed(1);
  return `${s.endsWith(".0") ? s.slice(0, -2) : s}%`;
}

// ポイント差（±）を "+3.2" / "-1.5" / "±0" で表す。
function formatDeltaPt(pt: number): string {
  const s = Math.abs(pt).toFixed(1);
  const trimmed = s.endsWith(".0") ? s.slice(0, -2) : s;
  return pt === 0 ? "±0" : pt > 0 ? `+${trimmed}` : `-${trimmed}`;
}

// 勝率(0〜1)に応じた文字色。デッキ詳細の勝率リング（DeckById）と同じ閾値に合わせる。
function winRateColorClass(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

type Props = {
  // このデッキの対戦結果(対戦)の数。deck-usage の count = COUNT(DISTINCT matches.id)。
  // 記録(イベント)の数ではなく、記録内の各対戦を数えた値。
  count: number;
  // あなたのこのデッキでの勝率(0〜1)。
  winRate: number;
  // 同デッキの環境平均勝率(0〜1)。環境データが引けない・圏外なら null。
  envWinRate: number | null;
};

// あなたの勝率と、比較の錨（環境平均 or 勝ち越しライン）を並べる比較行。
// 解錠済み（対戦数が十分）のときに、後払いの報酬＝「積み上げた実データ」を返す。
function CompareRow({
  winRate,
  count,
  anchorLabel,
  anchorRate,
}: {
  winRate: number;
  count: number;
  anchorLabel: string;
  anchorRate: number;
}) {
  const deltaPt = (winRate - anchorRate) * 100;
  const deltaColor =
    deltaPt > 0 ? "text-success" : deltaPt < 0 ? "text-warning" : "text-default-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 rounded-xl bg-default-100 px-3 py-2">
          <div className="text-[0.625rem] font-bold text-default-400">あなたの勝率</div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-black tabular-nums leading-tight ${winRateColorClass(winRate)}`}
            >
              {formatPercent(winRate)}
            </span>
            <span className="text-[0.625rem] font-bold text-default-400">n={count}</span>
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-default-100 px-3 py-2">
          <div className="text-[0.625rem] font-bold text-default-400">{anchorLabel}</div>
          <span className="text-xl font-black tabular-nums leading-tight text-default-500">
            {formatPercent(anchorRate)}
          </span>
        </div>
      </div>
      {/* 差分（このカードの主役＝あなたの実データが基準をどれだけ上回ったか） */}
      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-default-50 py-1.5">
        <span className="text-[0.6875rem] font-bold text-default-500">{anchorLabel}より</span>
        <span className={`text-sm font-black tabular-nums ${deltaColor}`}>
          {formatDeltaPt(deltaPt)}pt
        </span>
      </div>
    </div>
  );
}

// 施策E-3「価値メーター＋暫定値の環境補完」。
// 後払いの報酬（＝対戦数が貯まって初めて意味を持つ個人勝率）を"見える距離"に変える。
// カードは常時表示し、対戦数で2モードに切り替える:
//   ・解錠前（count < MAGIC）= メーターモード:
//       ① 「あと◯戦で"参考になる"精度に解錠」を near-term ゴールに（環境非依存で常に出す）。
//       ② 環境平均が引ければ暫定勝率に併記（借りて→返す）。
//   ・解錠済み（count >= MAGIC）= 比較モード（後払いの報酬を返す）:
//       あなたの勝率 vs 比較の錨 ＋ 差分(pt)。
//       錨は「同デッキの環境平均勝率」。環境データが無いときは「勝ち越しライン(50%)」にフォールバック。
export default function DeckValueMeter({ count, winRate, envWinRate }: Props) {
  const impressionSent = useRef(false);

  const remaining = Math.max(MAGIC_DECK_MATCHES - count, 0);
  const progress = Math.min(count / MAGIC_DECK_MATCHES, 1) * 100;
  const hasOwn = count > 0;
  const hasEnv = envWinRate != null;
  const unlocked = count >= MAGIC_DECK_MATCHES;

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    sendGAEvent("event", "value_meter_impression", {
      record_count: count,
      remaining,
      has_env: hasEnv,
      mode: unlocked ? "compare" : "meter",
    });
  }, [count, remaining, hasEnv, unlocked]);

  // ===== 解錠済み: 比較モード =====
  if (unlocked) {
    return (
      <Card className="w-full">
        <CardBody className="flex flex-col gap-3 px-3 py-3">
          <div className="flex items-center gap-1.5">
            <LuCircleCheck className="text-success" />
            <span className="text-tiny font-bold text-default-600">
              十分な対戦数に到達 ・ 信頼できる勝率
            </span>
          </div>

          {hasEnv ? (
            <>
              <CompareRow
                winRate={winRate}
                count={count}
                anchorLabel="同デッキの環境平均勝率"
                anchorRate={envWinRate}
              />
              <p className="text-[0.625rem] leading-relaxed text-default-400">
                {winRate - envWinRate > 0.001
                  ? "環境平均を上回る勝率を、あなた自身の対戦で積み上げました。"
                  : winRate - envWinRate < -0.001
                    ? "環境平均には届いていませんが、これはあなたの実データ。相性や立ち回りに伸びしろがあります。"
                    : "環境平均とほぼ互角。ここからの工夫で差がつきます。"}
              </p>
            </>
          ) : (
            <>
              {/* 環境データが無いときの別表示: 常に取れる「勝ち越しライン(50%)」を錨に比較 */}
              <CompareRow
                winRate={winRate}
                count={count}
                anchorLabel="勝ち越しライン"
                anchorRate={BREAK_EVEN}
              />
              <p className="text-[0.625rem] leading-relaxed text-default-400">
                同デッキの環境平均勝率は今週分がまだ揃っていません。
                <br />
                揃うと、勝ち越しラインに代えて環境平均との比較を表示します。
              </p>
            </>
          )}
        </CardBody>
      </Card>
    );
  }

  // ===== 解錠前: メーターモード =====
  return (
    <Card className="w-full">
      <CardBody className="flex flex-col gap-3 px-3 py-3">
        {/* ② 暫定値の環境補完（借りて→返す）: 個人の暫定勝率と、錨となる同デッキ環境平均を併記。
            環境平均が引けない（圏外・データ薄）ときは、個人の暫定勝率のみを控えめに見せる。 */}
        <div className="flex items-stretch gap-2">
          <div className="flex-1 rounded-xl bg-default-100 px-3 py-2">
            <div className="text-[0.625rem] font-bold text-default-400">あなたの暫定勝率</div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-lg font-black tabular-nums leading-tight ${
                  hasOwn ? "text-default-600" : "text-default-300"
                }`}
              >
                {hasOwn ? formatPercent(winRate) : "—"}
              </span>
              {hasOwn && (
                <span className="text-[0.625rem] font-bold text-default-400">n={count}</span>
              )}
            </div>
          </div>
          {hasEnv && (
            <div className="flex-1 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
              <div className="text-[0.625rem] font-bold text-primary/70">
                同デッキの環境平均勝率
              </div>
              <span className="text-lg font-black tabular-nums leading-tight text-primary">
                {formatPercent(envWinRate)}
              </span>
            </div>
          )}
        </div>

        {/* 対戦数が少ないうちの但し書き（環境の錨がある/ない、記録前/記録中で出し分け） */}
        <p className="-mt-1 text-[0.625rem] leading-relaxed text-default-400">
          {hasEnv ? (
            hasOwn ? (
              <>
                まだ対戦数が少ないので、同デッキの環境平均勝率を錨にあなたの勝率を読み解けます。
                <br />
                対戦を重ねるほど、あなたの数字が主役になります。
              </>
            ) : (
              <>
                先に同デッキの環境平均勝率を見せています。
                <br />
                対戦を記録するほど、あなた自身の勝率が立ち上がります。
              </>
            )
          ) : hasOwn ? (
            <>
              まだ対戦数が少ないので、この勝率は暫定です。
              <br />
              対戦を重ねるほど信頼できる数字になります。
            </>
          ) : (
            "対戦を記録すると、このデッキのあなたの勝率が育ち始めます。"
          )}
        </p>

        {/* ① 価値メーター: 解錠までの距離を near-term ゴールとして可視化 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 text-tiny font-bold text-default-600">
              <LuGauge className="text-primary" />
              価値メーター
            </span>
            <span className="text-[0.625rem] font-bold tabular-nums text-default-400">
              {Math.min(count, MAGIC_DECK_MATCHES)} / {MAGIC_DECK_MATCHES} 戦
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-default-200">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[0.6875rem] font-semibold leading-relaxed text-default-500">
            あと <span className="font-bold text-primary">{remaining}戦</span> で、
            このデッキの勝率が
            <span className="font-bold text-primary">「参考になる」精度</span>
            に解錠されます
          </p>
          <p className="mt-1 text-[0.625rem] leading-relaxed text-default-400">
            ※ 解錠に必要な対戦数（{MAGIC_DECK_MATCHES}
            戦）は暫定基準です。継続者データの分析後に較正します。
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
