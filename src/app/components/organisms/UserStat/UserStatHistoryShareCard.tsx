"use client";

import { Fragment } from "react";

import { Card, CardBody } from "@heroui/react";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import ShareWinRateLineChart from "@app/components/molecules/Share/ShareWinRateLineChart";
import { UserStatMonthlyType } from "@app/types/user_stat_history";
import { hasWinRate } from "@app/utils/winRate";
import { formatShortYearMonth, spansMultipleYears } from "@app/utils/yearMonthLabel";

// 絞り込んでいるデッキ。見出しにデッキ名とスプライトを出す
export type ShareHistoryDeck = {
  name: string;
  // スロット順のスプライト(常に2枠。無い枠は unknown で表示される)
  spriteIds: [string | undefined, string | undefined];
  // スプライトが1体でも登録されているか。無ければスプライトは出さない
  // (モンスターボール2つはデッキの手掛かりにならないため。画面のパネルと同じ扱い)
  hasSprite: boolean;
};

type Props = {
  // 集計期間(例: 「直近3ヶ月」「チャンピオンシップシリーズ2027(エクストラ)」)
  periodLabel: string;
  // 絞り込んでいるデッキ。null ならすべての使用デッキで集計したもの
  deck: ShareHistoryDeck | null;
  months: UserStatMonthlyType[];
  // 不戦勝・不戦敗を除いた数字か
  excludeDefaultMatches: boolean;
  // シェア画像の幅(px)。グラフの幅を決めるのに使う
  width: number;
};

// 見出しに並べるデッキのスプライトの枠(px)
const DECK_SPRITE_SIZE = 40;

// カードの左右パディング(p-4 = 16px)。グラフはこの内側に描く
const CARD_PADDING_X = 16;

// 点の上に勝率を添える月数の上限。これより多いと隣の勝率と重なるため、
// グラフには点だけを描き、数字は下の一覧に任せる
const MAX_VALUE_LABELS = 6;

/*
 * 「月毎の勝率推移」パネルのシェア画像用カード。
 *
 * 画面のパネルからフィルタ操作用のUI(セレクタ)とタップ操作を外し、グラフと月ごとの数字を
 * 載せた静止した見た目にする。画面ではグラフをタップすると月ごとの数字が出るが、
 * 画像ではタップできないため、グラフの下に一覧で添える。
 * グラフは <canvas> ではなく SVG で描く（理由は ShareWinRateLineChart のコメントを参照）。
 */
export default function UserStatHistoryShareCard({
  periodLabel,
  deck,
  months,
  excludeDefaultMatches,
  width,
}: Props) {
  const withYear = spansMultipleYears(months.map((m) => m.year_month));
  const points = months.map((m) => ({
    label: formatShortYearMonth(m.year_month, withYear),
    // 画面のグラフと同じく小数第1位までに丸める
    value: Math.round(m.win_rate * 1000) / 10,
  }));

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-sm font-bold text-default-700">月毎の勝率推移</h2>
          {/* どのデッキ使用時の推移か。デッキを選んでいればスプライトとデッキ名で示す */}
          {deck ? (
            <div className="flex flex-col items-center">
              {deck.hasSprite && (
                <div className="flex">
                  <PokemonSprite id={deck.spriteIds[0]} size={DECK_SPRITE_SIZE} />
                  <PokemonSprite id={deck.spriteIds[1]} size={DECK_SPRITE_SIZE} />
                </div>
              )}
              {/* 長いデッキ名は折り返す。「使用時」は名前の途中で切れないよう一続きにする */}
              <p className="text-center text-xs text-default-500">
                <span className="font-bold text-default-700">『{deck.name}』</span>
                <span className="whitespace-nowrap">使用時</span>
              </p>
            </div>
          ) : (
            <p className="text-center text-xs text-default-400">すべての使用デッキ</p>
          )}
          <p className="text-center text-xs text-default-400">{periodLabel}</p>
          {/* 不戦勝・不戦敗を外した数字は公式のスイスドロー成績と一致しない。
              画像は文脈から切り離されて出回るので、断り書きを画像自体に載せる */}
          {excludeDefaultMatches && (
            <p className="text-[0.625rem] font-bold text-default-400">
              不戦勝・不戦敗を除く
            </p>
          )}
        </div>

        <ShareWinRateLineChart
          points={points}
          width={width - CARD_PADDING_X * 2}
          showValues={months.length <= MAX_VALUE_LABELS}
        />

        {/* 月ごとの数字。月が多い(シーズン表示)ときは縦に長くなりすぎないよう2列にする。
            2列のときも上から下へ時系列で読めるよう、前半を左・後半を右に分ける */}
        {months.length > MAX_VALUE_LABELS ? (
          <div className="grid grid-cols-2 gap-1.5">
            <MonthTable
              months={months.slice(0, Math.ceil(months.length / 2))}
              withYear={withYear}
              compact
            />
            <MonthTable
              months={months.slice(Math.ceil(months.length / 2))}
              withYear={withYear}
              compact
            />
          </div>
        ) : (
          <MonthTable months={months} withYear={withYear} />
        )}
      </CardBody>
    </Card>
  );
}

/*
 * 月ごとの勝率と勝敗の一覧。
 *
 * 月・勝率・勝敗を列として縦に揃える。行ごとに横並びにすると、勝敗の長さ
 * (「5勝5敗」と「7勝3敗1分」)で勝率の位置が行ごとにずれてしまうため、一覧全体を1つの
 * グリッドにして列の幅を全行で共有する。行の地(角丸の面)は同じ行に重ねて置く。
 *   1列目 … 月(左寄せ)
 *   2列目 … 空き(余りを吸って、勝率と勝敗を右へ寄せる)
 *   3列目 … 勝率(右寄せ。小数第1位までなので小数点の位置が揃う)
 *   4列目 … 勝敗(左寄せ。はみ出すときは省略する)
 */
function MonthTable({
  months,
  withYear,
  compact = false,
}: {
  months: UserStatMonthlyType[];
  withYear: boolean;
  // 2列に並べるとき。1行の幅が狭いので左右の余白を詰める
  compact?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,max-content)] items-center gap-y-1.5">
      {months.map((m, i) => {
        const row = i + 1;
        const draws = Math.max(0, m.total_matches - m.wins - m.losses);
        return (
          <Fragment key={m.year_month}>
            {/* 行の地。行の4列ぶんに敷き、上に文字を重ねる */}
            <div
              className="col-span-full self-stretch rounded-xl bg-default-100"
              style={{ gridRow: row }}
            />
            <span
              className={`py-1.5 text-xs font-bold text-default-700 tabular-nums ${compact ? "pl-2.5" : "pl-3"}`}
              style={{ gridRow: row, gridColumn: 1 }}
            >
              {formatShortYearMonth(m.year_month, withYear)}
            </span>
            <span
              className="pl-2 text-right text-xs font-black text-primary tabular-nums"
              style={{ gridRow: row, gridColumn: 3 }}
            >
              {/* 勝ちも負けも無い月は勝率が存在しない(0.0% だと全敗と読めてしまう) */}
              {hasWinRate(m.wins, m.losses) ? `${(m.win_rate * 100).toFixed(1)}%` : "-"}
            </span>
            <span
              className={`truncate pl-1.5 text-[0.625rem] text-default-400 tabular-nums ${compact ? "pr-2.5" : "pr-3"}`}
              style={{ gridRow: row, gridColumn: 4 }}
            >
              {m.wins}勝{m.losses}敗{draws > 0 ? `${draws}分` : ""}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
