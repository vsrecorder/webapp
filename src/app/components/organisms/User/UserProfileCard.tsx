"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Card, CardBody, useDisclosure } from "@heroui/react";
import {
  LuSwords,
  LuTrophy,
  LuShield,
  LuPencil,
  LuEye,
  LuEyeOff,
  LuIdCard,
  LuCircleCheck,
} from "react-icons/lu";

import UpdateNameModal from "@app/components/organisms/User/Modal/UpdateNameModal";
import FetchError from "@app/components/molecules/FetchError";

import { UserType } from "@app/types/user";
import { UserStatType } from "@app/types/user_stat";
import { UserPlayerType } from "@app/types/user_player";

type Props = {
  user: UserType;
  isDevEnv?: boolean;
  userCreatedAt?: string;
};

// 年月を「年 * 12 + (月 - 1)」の通し番号に変換する。基準は常にJST。
//
// Date の getFullYear/getMonth は端末のタイムゾーンで解釈されるため、これで年月を
// 組み立てるとサーバ(TZ=Asia/Tokyo)とJST以外の端末とで月替わりの瞬間に食い違い、
// ハイドレーション不一致や「選択中の年月が選択肢に無い」状態を招く。+9時間ずらして
// UTCとして読むことでJSTに固定する。
//
// 月の加減算も Date ではなくこの通し番号の整数演算で行う(年跨ぎを自前で扱わずに済む)。
function jstYearMonthIndex(date: Date): number {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCFullYear() * 12 + jst.getUTCMonth();
}

function yearMonthValue(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

// JST で現在の年月("YYYY-MM")を返す
function getCurrentYearMonthValue(): string {
  return yearMonthValue(jstYearMonthIndex(new Date()));
}

function yearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}年${Number(month)}月`;
}

// 登録月(なければ直近12ヶ月)〜当月までの年月選択肢を新しい順で生成する
function generateYearMonthOptions(createdAt?: Date) {
  const currentIndex = jstYearMonthIndex(new Date());
  const startIndex = createdAt ? jstYearMonthIndex(createdAt) : currentIndex - 11;

  const options: { value: string; label: string }[] = [];
  for (let index = currentIndex; index >= startIndex; index--) {
    const value = yearMonthValue(index);
    options.push({ value, label: yearMonthLabel(value) });
  }

  return options;
}

// フレームがこの間隔以内で描けていれば「滑らかに描ける状態」とみなす(およそ25fps以上)。
const SMOOTH_FRAME_MS = 40;
// 走行中にこれ以上フレームがあいたら「詰まった」と判断する。
// 100ms 前後から人の目には「止まった」と映るため、その手前を閾値にしている。
const JANK_FRAME_MS = 100;
// 滑らかに描けるようになるのを待つ上限。これを超えたらアニメーションを諦める。
// ローディング表示を引き延ばしすぎない範囲に収める。
const MAX_WAIT_MS = 400;

// target が変わったとき 0 → target へカウントアップする。
// 戻り値が null の間は「まだ数値を出さない」= 呼び出し側はローディング表示を続ける。
//
// ホームは他のパネル(チャートの遅延読み込み、各パネルの取得結果の反映)が同時に立ち上がるため、
// 戦績が届いた直後はメインスレッドが詰まりやすい。詰まっている間はフレーム自体が描けないので、
// 進捗の計算をどう工夫してもカウントアップは途中で止まって見える
// (実測: 0.0% のまま402ms停止 → 18.6%へ跳ぶ → 途中でも133ms停止)。
//
// そこで「滑らかに出せないならアニメーションしない」方針を取る。
//   1. まずフレームの間隔を観測し、連続して滑らかに描けることを確かめてから走り出す。
//      カウントアップの1フレーム目は 0 を描くので、確かめる前に走らせると
//      「0.0% で止まってから跳ぶ」ことになる(本番ビルドでも4x絞りで101ms停止を実測)。
//   2. 走行中にコマ落ちを検知したら、その場で打ち切って最終値へ送る。
//   3. 待っても整わなければアニメーションせず最終値をそのまま出す。
// 数値が出てから止まると壊れて見えるため、走らせるか決まるまでは数値を返さない(null)。
// 結果として表示は
//   ・空いている  → 0 から滑らかにカウントアップ
//   ・詰まっている → ローディング表示のまま待ち、最終値をそのまま表示
// のどちらかになり、「途中で止まって跳ぶ」中間状態が出ない。
function useCountUp(target: number | null, duration = 700): number | null {
  // どの target に対する表示値なのかを持たせ、target が変わった直後(=まだ何も描いていない)を
  // 「出さない」状態として描画時に判別できるようにする。
  const [state, setState] = useState<{ target: number; value: number } | null>(null);

  useEffect(() => {
    if (target === null) return;

    const to = target;
    const scheduledAt = performance.now();
    // 走り出す前の観測用。滑らかに描けたフレームが連続した回数を数える。
    let prevFrame: number | null = null;
    let smoothFrames = 0;
    // 走行開始時刻。null の間はまだ観測中。
    let startTime: number | null = null;
    let lastFrame = 0;
    let raf = 0;

    function step() {
      // rAF に渡される時刻はフレームの開始時刻で、effect の実行時刻より前になることがある
      // (実時間で計算すると進捗が負になり、一瞬マイナスの数字が出る)。基準を揃えるため
      // ここでは performance.now() を使う。
      const now = performance.now();

      if (startTime === null) {
        // 動かす必要がない(0戦0勝など)ならそのまま出す
        if (to === 0) {
          setState({ target: to, value: to });
          return;
        }

        if (prevFrame !== null && now - prevFrame <= SMOOTH_FRAME_MS) smoothFrames++;
        else smoothFrames = 0;
        prevFrame = now;

        if (smoothFrames < 2) {
          // まだ滑らかと言い切れない。待ちすぎるならアニメーションを諦める。
          if (now - scheduledAt > MAX_WAIT_MS) {
            setState({ target: to, value: to });
            return;
          }
          raf = requestAnimationFrame(step);
          return;
        }

        startTime = now;
      } else if (now - lastFrame > JANK_FRAME_MS) {
        // 走行中に詰まった。中途半端な位置から跳ねさせず、最終値へ送って終わる。
        setState({ target: to, value: to });
        return;
      }
      lastFrame = now;

      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setState({ target: to, value: t < 1 ? to * eased : to });

      if (t < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  // 表示値が現在の target に対応しているときだけ返す
  return state !== null && state.target === target ? state.value : null;
}

function winRateColor(rate: number): string {
  if (rate >= 0.55) return "text-emerald-300";
  if (rate >= 0.45) return "text-white";
  if (rate >= 0.4) return "text-amber-300";
  return "text-rose-300";
}

type WinRateBadgeProps = {
  winRate: number;
  isLoading: boolean;
  // 戦績の取得に失敗したか。0.0%と表示すると「勝率0%」と読めてしまうため、値は伏せる
  hasError: boolean;
  yearMonth: string;
  yearMonthOptions: { value: string; label: string }[];
  onYearMonthChange: (value: string) => void;
  hidden: boolean;
  onToggle: () => void;
};

function WinRateBadge({
  winRate,
  isLoading,
  hasError,
  yearMonth,
  yearMonthOptions,
  onYearMonthChange,
  hidden,
  onToggle,
}: WinRateBadgeProps) {
  // winRate は 0〜1 なので ×1000 して小数1桁精度でカウントアップ
  const animated = useCountUp(isLoading ? null : winRate * 1000, 900);
  // null の間はまだ数値を出さない(取得中と同じローディング表示のままにする)
  const pct = animated === null ? null : (animated / 10).toFixed(1);
  const color = isLoading ? "text-white/30" : winRateColor(winRate);

  return (
    <div className="flex flex-col justify-center items-end gap-0.5">
      <div className="relative flex items-center">
        {/* Chrome iOS はオートフィルのため、Reactがハイドレートする前にフォーム要素へ
            __gcruniqueid 属性を注入する。サーバのHTMLに無い属性がDOM側にだけ存在する形に
            なるため、ハイドレーション不一致の警告が出る(開発時のみ・動作には影響しない)。
            ブラウザ側の注入なのでアプリからは防げないため、この要素に限って抑止する。
            抑止はこの要素自身の属性のみに効き、<option>の不一致は従来どおり検出される。 */}
        <select
          suppressHydrationWarning
          name="user-profile-year-month"
          value={yearMonth}
          onChange={(e) => onYearMonthChange(e.target.value)}
          aria-label="表示する年月を選択"
          className="appearance-none bg-transparent text-white/90 text-[12px] font-semibold text-right pr-3.5 focus:outline-none [&>option]:text-default-700"
        >
          {yearMonthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-0 text-white/70 text-[8px]">
          ▼
        </span>
      </div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-white/70 hover:text-white/90 transition-colors pb-1"
        aria-label={hidden ? "戦績を表示する" : "戦績を非表示にする"}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest">WIN RATE</span>
        {hidden ? (
          <LuEyeOff className="w-3 h-3 shrink-0" />
        ) : (
          <LuEye className="w-3 h-3 shrink-0" />
        )}
      </button>
      <button
        onClick={onToggle}
        className="pb-0.5"
        aria-label={hidden ? "戦績を表示する" : "戦績を非表示にする"}
      >
        {hidden ? (
          <span className="text-3xl font-black text-white/30 leading-none">——</span>
        ) : hasError ? (
          <span className="text-3xl font-black text-white/30 leading-none">—</span>
        ) : isLoading || pct === null ? (
          <span className="text-3xl font-black text-white/30 animate-pulse leading-none">
            —
          </span>
        ) : (
          <span className={`text-3xl font-black leading-none tabular-nums ${color}`}>
            {pct}
            <span className="text-base font-bold">%</span>
          </span>
        )}
      </button>
    </div>
  );
}

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  isLoading: boolean;
  hidden: boolean;
  colorClass?: string;
  // 値の右隣に小さく添える補足(試合数に対する引き分け数「（N分）」など)
  suffix?: React.ReactNode;
};

function StatChip({
  icon,
  label,
  value,
  isLoading,
  hidden,
  colorClass = "text-default-700",
  suffix,
}: StatChipProps) {
  // null の間はまだ数値を出さない(取得中と同じローディング表示のままにする)
  const animated = useCountUp(isLoading ? null : value);

  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-default-100">
      <div className={`text-sm ${isLoading ? "text-default-300" : colorClass}`}>
        {icon}
      </div>
      {hidden ? (
        <span className="text-lg font-black text-default-300 leading-none">——</span>
      ) : isLoading || animated === null ? (
        <span className="text-lg font-black text-default-300 animate-pulse leading-none">
          —
        </span>
      ) : (
        <span className="flex items-baseline gap-0.5">
          <span
            className={`text-lg font-black tabular-nums leading-none ${colorClass}`}
          >
            {Math.round(animated).toLocaleString()}
          </span>
          {suffix}
        </span>
      )}
      <span className="text-[9px] font-bold text-default-400 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

type PlayersClubBadgeProps = {
  isLoading: boolean;
  userPlayer: UserPlayerType | null;
};

// チャンピオンシップポイントは表示しない。
// プレイヤーIDの実在確認・所有権確認を行わない方針にしたため、連携されている
// player_id が本人のものである保証がなく、他人のポイントを表示しうるため。
function PlayersClubBadge({ isLoading, userPlayer }: PlayersClubBadgeProps) {
  if (isLoading) {
    return <span className="block w-28 h-3 rounded-full bg-white/20 animate-pulse" />;
  }

  if (userPlayer) {
    return (
      <span className="flex items-center gap-1 text-white/80 text-[10px] font-medium">
        <LuCircleCheck className="w-3 h-3 shrink-0" />
        プレイヤーズクラブ連携済み
      </span>
    );
  }

  return (
    <Link
      href="/users?link_player=1"
      className="flex items-center gap-1 text-white/80 hover:text-white text-[10px] font-medium underline underline-offset-2"
    >
      <LuIdCard className="w-3 h-3 shrink-0" />
      プレイヤーズクラブと連携する
    </Link>
  );
}

const STATS_VISIBLE_KEY = "profile_stats_visible";

export default function UserProfileCard({
  user,
  isDevEnv = false,
  userCreatedAt,
}: Props) {
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statError, setStatError] = useState(false);
  const [userPlayer, setUserPlayer] = useState<UserPlayerType | null>(null);
  const [isUserPlayerLoading, setIsUserPlayerLoading] = useState(true);
  const [isPlayersClubFeatureDisabled, setIsPlayersClubFeatureDisabled] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, imageUrl: user.image_url });
  const [statsVisible, setStatsVisible] = useState(true);
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonthValue);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);

  useEffect(() => {
    const stored = localStorage.getItem(STATS_VISIBLE_KEY);
    if (stored !== null) setStatsVisible(stored !== "false");
  }, []);

  function toggleStatsVisible() {
    setStatsVisible((prev) => {
      const next = !prev;
      localStorage.setItem(STATS_VISIBLE_KEY, String(next));
      return next;
    });
  }

  // 取得に失敗したことを「勝率0.0% / 0戦0勝0敗」の表示で覆い隠さないよう、
  // 失敗はエラーとして扱い、戦績の部分だけで取り直せるようにする。
  const loadStat = useCallback(async () => {
    setStatError(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/stat?year_month=${yearMonth}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data: UserStatType = await res.json();

      setStat(data);
    } catch (err) {
      console.log(err);
      setStatError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, yearMonth]);

  useEffect(() => {
    loadStat();
  }, [loadStat]);

  useEffect(() => {
    setIsUserPlayerLoading(true);
    fetch("/api/usersplayers", { cache: "no-store" })
      .then((r) => {
        if (r.status === 503) {
          setIsPlayersClubFeatureDisabled(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        setUserPlayer(data);
        setIsUserPlayerLoading(false);
      })
      .catch(() => setIsUserPlayerLoading(false));
  }, []);

  return (
    <>
      <UpdateNameModal
        userId={user.id}
        currentName={profile.name}
        imageUrl={profile.imageUrl}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onUpdated={setProfile}
      />
      <Card className="overflow-hidden shadow-md">
        {/* グラデーションヘッダー（dev環境は本番と一目で区別できるようオレンジ系にする） */}
        <div
          className={`px-3 pt-4 pb-5 flex items-center gap-3.5 ${
            isDevEnv
              ? "bg-linear-to-br from-orange-500 via-orange-600 to-amber-700"
              : "bg-linear-to-br from-primary via-primary to-secondary"
          }`}
        >
          <button onClick={onOpen} className="shrink-0" aria-label="プロフィールを編集">
            <Avatar
              src={profile.imageUrl}
              size="lg"
              isBordered
              color="default"
              classNames={{ base: "ring-2 ring-white/40" }}
            />
          </button>
          <div className="min-w-0 overflow-hidden flex flex-col gap-1">
            <button
              onClick={onOpen}
              className="min-w-0 overflow-hidden text-white/60 hover:text-white/90 transition-colors"
              aria-label="プロフィールを編集"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-white font-black text-base leading-tight truncate min-w-0">
                  {profile.name}
                </span>
                <LuPencil className="w-3.5 h-3.5 shrink-0" />
              </div>
            </button>
            {!isPlayersClubFeatureDisabled && (
              <PlayersClubBadge isLoading={isUserPlayerLoading} userPlayer={userPlayer} />
            )}
          </div>
          <div className="ml-auto shrink-0">
            <WinRateBadge
              winRate={stat?.win_rate ?? 0}
              isLoading={isLoading}
              hasError={statError}
              yearMonth={yearMonth}
              yearMonthOptions={yearMonthOptions}
              onYearMonthChange={setYearMonth}
              hidden={!statsVisible}
              onToggle={toggleStatsVisible}
            />
          </div>
        </div>

        {/* 統計グリッド。取得に失敗したときは0件の戦績を装わず、ここだけをエラー表示に置き換える
            （プロフィール部分は表示したままにする） */}
        <CardBody className="p-3 -mt-2 bg-content1 rounded-t-2xl relative z-10">
          {statError ? (
            <FetchError message="戦績の取得に失敗しました" onRetry={loadStat} compact />
          ) : (
            <div className="grid grid-cols-3 gap-5">
              <StatChip
                icon={<LuSwords className="w-3.5 h-3.5" />}
                label="試合数"
                value={stat?.total_matches ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
                // 試合数 = 勝利 + 敗北 + 引き分け。勝敗の合計と試合数が食い違う分の
                // 引き分け数を右隣に「（N分）」で表示し、内訳が分かるようにする。
                suffix={
                  (() => {
                    const draws = Math.max(
                      0,
                      (stat?.total_matches ?? 0) -
                        (stat?.wins ?? 0) -
                        (stat?.losses ?? 0),
                    );
                    return draws > 0 ? (
                      <span
                        title="引き分け"
                        className="text-[10px] font-bold text-default-400"
                      >
                        （{draws}分）
                      </span>
                    ) : null;
                  })()
                }
              />
              <StatChip
                icon={<LuTrophy className="w-3.5 h-3.5" />}
                label="勝利"
                value={stat?.wins ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
                colorClass="text-success"
              />
              <StatChip
                icon={<LuShield className="w-3.5 h-3.5" />}
                label="敗北"
                value={stat?.losses ?? 0}
                isLoading={isLoading}
                hidden={!statsVisible}
                colorClass="text-danger"
              />
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
