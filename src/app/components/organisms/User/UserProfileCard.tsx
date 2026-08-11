"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// 1フレームとして認める最大間隔(ms)。これを超えた分は「描けなかった時間」とみなし、
// 進捗に加算しない。60fpsで16.7ms、30fpsで33.3msなので、実際にコマ落ちしている場合だけ
// 引っかかる値にしている。
const MAX_FRAME_MS = 50;

// target が変わったとき from → target へアニメーション
//
// 進捗は「開始時刻からの実時間」ではなく、フレーム間隔を積み上げた時間で決めている。
// ホームは他のパネル(チャートの遅延読み込み、各パネルの取得結果の反映)が同時に立ち上がるため、
// カウントアップの最中にメインスレッドが数百ms詰まってフレームが飛ぶ。実時間で進捗を出すと
// 詰まっている間は描画が止まったまま時間だけ進み、空いた瞬間に一気に跳ぶ
// (「一度止まってからまたカウントされる」見え方になる)。上限を超えた間隔を捨てることで、
// 詰まりを跳ねではなく一時停止に変え、止まった続きから滑らかに再開させる。
//
// 起点に performance.now() ではなく最初のフレームのタイムスタンプを使うのも同じ理由。
// requestAnimationFrame に渡る時刻はそのフレームの開始時刻なので、effect の実行時刻より
// 前になることがある。実時間で計算すると初回フレームの進捗が負になり、一瞬マイナスの数字
// (例: -3.3%)が表示される。
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (target === from) return;

    let elapsed = 0;
    let lastTime: number | null = null;
    let raf = 0;

    function step(now: number) {
      // 最初のフレームは基準時刻を取るだけ(進捗0なので表示は from のまま)
      if (lastTime === null) {
        lastTime = now;
        raf = requestAnimationFrame(step);
        return;
      }

      elapsed += Math.min(now - lastTime, MAX_FRAME_MS);
      lastTime = now;

      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(t < 1 ? from + (target - from) * eased : target);

      if (t < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
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
  const animated = useCountUp(isLoading ? 0 : winRate * 1000, 900);
  const pct = (animated / 10).toFixed(1);
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
        ) : isLoading ? (
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
  const animated = useCountUp(isLoading ? 0 : value);

  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl bg-default-100">
      <div className={`text-sm ${isLoading ? "text-default-300" : colorClass}`}>
        {icon}
      </div>
      {hidden ? (
        <span className="text-lg font-black text-default-300 leading-none">——</span>
      ) : isLoading ? (
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
