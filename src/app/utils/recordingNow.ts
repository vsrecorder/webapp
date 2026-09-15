import { MatchSummaryType } from "@app/types/match";
import { RecordType } from "@app/types/record";
import { toJSTDateString, todayJSTDateString } from "@app/utils/date";

/*
 * ホームの「記録中のイベント」カードを出すかどうかの判定。
 *
 * 大会やPTCGLの合間に2戦目・3戦目を足すまでが遠い、というお問い合わせへの対応。
 * 記録カードを開いてメニューを辿らなくても、ホームから直接1件足せるようにする。
 *
 * 出す条件は3つとも満たすこと:
 *   1. event_date が今日か昨日(JST)の記録のうち、最新の1件
 *   2. その記録の「最後の動き」から、起点ごとに決まる窓の内側にいること
 *      (対戦が1件以上 → last_match_at から6時間 / 対戦0件 → created_at から18時間)
 *   3. 「記録を終える」で閉じられていない
 *
 * 逆に、次のどれかで消える:
 *   ・最後の動きから窓のぶん経つ(日付が変わっただけでは消さない。深夜の記録を切らないため)
 *   ・「記録を終える」を押す(その日のあいだ出さない)
 *
 * 時刻の扱いに注意。event_date は DATE カラムで UTC 0時に寄って返るため、
 * 暦日の一致は toJSTDateString() の文字列比較で行う。一方 created_at /
 * last_match_at は実時刻(TIMESTAMP)なので、経過時間は生の Date どうしで引く。
 * この2つを混ぜると時差のぶんずれる。
 */

/*
 * 「記録中」と見なす時間の窓。最後に手が動いてからこれを過ぎたら引っ込める。
 * 起点によって長さが違う。
 *
 * 対戦がまだ0件のとき(起点は記録を作った時刻)は長く取る。大会の朝や前夜に記録だけ先に
 * 作っておく人がいて、1戦目が始まる前に消えてしまうと、いちばん使いたい場面で無くなる。
 */
export const RECORDING_WINDOW_NO_MATCH_MS = 18 * 60 * 60 * 1000;

/*
 * 対戦が入り始めたあと(起点は最後の対戦)の窓。
 *
 * 試合と試合の間隔はこれより短いので、6時間空いたということは、その大会はもう
 * 終わっているとみなしてよい。終わった大会のカードが夜まで居座らずに済む。
 */
export const RECORDING_WINDOW_AFTER_MATCH_MS = 6 * 60 * 60 * 1000;

/*
 * 「記録を終える」で閉じた記録を覚えておく cookie。
 *
 * localStorage ではなく cookie なのは、サーバの初回描画でも読めるようにするため。
 * localStorage だと、閉じたはずのカードがサーバ描画で一度出てからクライアントで
 * 消えることになる(ホームの表示設定 — 並び・不戦勝の除外・戦績の伏せ字 — も
 * 同じ理由で cookie を併用している)。
 */
export const RECORDING_DISMISSED_COOKIE = "recordingDismissed";

// cookie の寿命。日付が変われば値自体が無効になるので、丸一日あれば足りる。
export const RECORDING_DISMISSED_COOKIE_MAX_AGE = 60 * 60 * 24;

/*
 * 画面下のバーだけを引っ込めた記録。値は "recordId:閉じた時刻(ミリ秒)"。
 *
 * 「記録を終える」(上の cookie)とは別物。記録中であること自体は終わらせないので、
 * ホームのカードは出たままで、バーだけがしばらく黙る。
 *
 * sessionStorage に置いているので、タブを閉じたりPWAを起動し直したりすれば消えて
 * すぐまた出る。同じセッションで見続けている場合も、下の時間が過ぎれば戻る。
 * 「いまは邪魔だが、記録はまだ続いている」を表す。
 */
export const RECORDING_BAR_HIDDEN_KEY = "recordingBarHidden";

/*
 * バーを引っ込めておく時間。
 *
 * 大会の合間に一度どけても、次の試合が終わる頃にはまた出ていてほしい。
 * 試合1回ぶんより短いくらいが目安。
 */
export const RECORDING_BAR_HIDDEN_MS = 10 * 60 * 1000;

// sessionStorage に入れる値
export function recordingBarHiddenValue(recordId: string, at: number = Date.now()): string {
  return `${recordId}:${at}`;
}

/*
 * 閉じた状態が明ける時刻(ミリ秒)。閉じていない・別の記録・壊れた値なら null。
 *
 * 「隠すか」ではなく「いつ明けるか」を返すのは、呼び出し側がその時刻にタイマーを
 * 張れるようにするため。画面を開いたまま待っている人にも、黙って戻ってくる。
 */
export function recordingBarHiddenUntil(
  value: string | null | undefined,
  recordId: string,
): number | null {
  if (!value) return null;

  const separator = value.lastIndexOf(":");
  if (separator === -1) return null;
  if (value.slice(0, separator) !== recordId) return null;

  const closedAt = Number(value.slice(separator + 1));
  if (!Number.isFinite(closedAt)) return null;

  return closedAt + RECORDING_BAR_HIDDEN_MS;
}

// いまバーを引っ込めておくべきか
export function isRecordingBarHidden(
  value: string | null | undefined,
  recordId: string,
  now: number = Date.now(),
): boolean {
  const until = recordingBarHiddenUntil(value, recordId);

  return until !== null && now < until;
}

/*
 * cookie に入れる値。終えた記録のIDそのもの。
 *
 * かつては "YYYY-MM-DD:recordId" として日付で失効させていたが、記録中が日付をまたぐように
 * なったので、日付で切ると「終えたはずの記録が0時に戻ってくる」ことになる。
 * 失効は cookie の寿命(24時間。窓の最長18時間より長い)に任せる。
 */
export function recordingDismissedValue(recordId: string): string {
  return recordId;
}

/*
 * その記録がすでに閉じられているか。
 * cookie は誰でも書き換えられるので、形の違う値は「閉じていない」として扱う。
 */
export function isRecordingDismissed(
  cookieValue: string | null | undefined,
  recordId: string,
): boolean {
  if (!cookieValue) return false;

  /*
   * 以前の形式("YYYY-MM-DD:recordId")で書かれた cookie も受ける。
   * 受けないと、入れ替わりの日に終えた人のカードが翌日いちどだけ戻ってしまう。
   */
  const separator = cookieValue.lastIndexOf(":");
  const value = separator === -1 ? cookieValue : cookieValue.slice(separator + 1);

  return value === recordId;
}

/*
 * 記録中の候補になる記録(イベント日が今日か昨日)のうち、最新の1件を返す。
 *
 * 昨日まで見るのは、日付をまたいで記録を続けることがあるため。PTCGL を深夜に回したり、
 * 大会のあと帰ってから入力したりすると、0時をまたいだ瞬間にイベント日が「今日」で
 * なくなる。そこで消えてしまうと、いちばん記録したい場面で使えない。
 *
 * それ以上は遡らない。何日も前の記録に対戦を足すのは「あとから整理している」のであって
 * 記録中ではない。実際にいつ引っ込むかは、この先の窓(最後の動きから6時間/18時間)が決める。
 *
 * 記録一覧は event_date DESC, created_at DESC で返るため、条件に合う最初の1件が
 * そのまま「最新」になる。候補が複数ある日(午前ジム・午後シティ)でも最新だけを見て、
 * それが窓を過ぎていれば2件目は見に行かない。
 *
 * 未来日の記録(大会の予定を先に作った場合)はどちらとも一致しないので自然に外れる。
 * event_date が未設定(ゼロ値)の記録も同じく外れる。
 */
export function pickRecordingCandidate(
  records: readonly RecordType[],
  today: string = todayJSTDateString(),
): RecordType | null {
  const yesterday = previousDate(today);

  for (const record of records) {
    const eventDate = record.data.event_date;
    if (!eventDate) continue;

    const date = toJSTDateString(eventDate);
    if (date === today || date === yesterday) return record;
  }

  return null;
}

// "YYYY-MM-DD" の前日。暦日どうしの計算なので実行時刻に依存しない
function previousDate(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().split("T")[0];
}

export type RecordingActivity = {
  // 最後に手が動いた時刻(ISO文字列)。判定できなければ null
  lastActiveAt: string | null;
  // その起点から数える窓の長さ(ミリ秒)
  windowMs: number;
};

/*
 * その記録で最後に手が動いた時刻と、そこから数える窓の長さ。
 *
 * 対戦が1件でもあれば最後の対戦の作成日時から6時間、まだ0件なら記録を作った時刻から18時間。
 * 「作ったばかりで対戦をこれから入れる」記録を弾かないために、0件の場合を分けている。
 *
 * summary が取れなかった場合(上流の失敗)も、対戦が1件以上あるのに last_match_at を
 * 返さない場合(上流が古い)も、記録の created_at に倒す。起点が記録の作成時刻まで
 * 遡るぶん、窓も長いほう(18時間)を使う。判定できないことを理由に消すより、
 * 窓で自然に引っ込むほうが害が小さい。
 */
export function recordingActivityOf(
  record: RecordType,
  summary: MatchSummaryType | null | undefined,
): RecordingActivity {
  if (summary && summary.total > 0 && summary.last_match_at) {
    return {
      lastActiveAt: toISOStringOrNull(summary.last_match_at),
      windowMs: RECORDING_WINDOW_AFTER_MATCH_MS,
    };
  }

  return {
    lastActiveAt: toISOStringOrNull(record.data.created_at),
    windowMs: RECORDING_WINDOW_NO_MATCH_MS,
  };
}

/*
 * 日時を ISO 文字列に揃える。
 *
 * 型の上では created_at は Date だが、API から来るのは文字列。取り違えると
 * String(Date) が端末の言語で書かれた文字列になり、比較も表示も壊れる。
 * 呼び出し側がどちらを渡しても同じ形で返す。
 */
function toISOStringOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// 最後の動きから窓の内側にいるか。どちらも実時刻なので生の Date どうしで引く
export function isWithinRecordingWindow(
  lastActiveAt: string | null,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  if (!lastActiveAt) return false;

  const time = new Date(lastActiveAt).getTime();
  if (Number.isNaN(time)) return false;

  const elapsed = now - time;
  // 未来の時刻(端末の時計ずれ・未来日の記録)も窓の中として扱う。
  // 負の経過で弾くと、時計が数分ずれているだけでカードが出なくなる
  return elapsed <= windowMs;
}

/*
 * 起点からの経過時間(「42分」「3時間」)。
 *
 * 「記録を作成してから◯◯経過」「最後の対戦から◯◯経過」の◯◯にあたる部分で、
 * 前後の言い回しは呼び出し側が付ける。放っておけば引っ込むことを伝えるための添え物。
 *
 * 1分未満も「1分」に丸める。「0分経過」「たった今経過」はどちらも据わりが悪く、
 * かといってここだけ言い回しを変えると呼び出し側が分岐を抱えることになる。
 */
export function formatElapsedDuration(lastActiveAt: string, now: number = Date.now()): string {
  const time = new Date(lastActiveAt).getTime();
  if (Number.isNaN(time)) return "";

  const elapsedMinutes = Math.floor((now - time) / (60 * 1000));
  if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)}分`;

  return `${Math.floor(elapsedMinutes / 60)}時間`;
}

