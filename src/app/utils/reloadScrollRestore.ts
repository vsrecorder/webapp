/*
 * リロードしたとき、直前に見ていた位置にとどまって表示する仕組み。
 *
 * 保存: 離脱時(pagehide / 非表示 / 再読み込みボタン)に位置を sessionStorage へ書く
 *       → saveScrollForReload。呼び出しは useScrollResetOnNavigation と ReloadButton。
 * 復元: ペイント前のインラインスクリプト(layout.tsx で <body> 先頭に置く)が行う
 *       → reloadScrollRestoreScript。
 *
 * 復元をインラインスクリプトで行う理由:
 *   以前は React のハイドレーション後(useEffect)から復元を始めていた。iOS の PWA では
 *   JS の読み込みとハイドレーションに時間がかかり、その間はサーバ描画の HTML が
 *   ページ先頭の位置で表示され、終わったところで元の位置へ飛んでいた。
 *   HTML の解析中に requestAnimationFrame のループを始めれば、ループはペイントの直前に
 *   走るので、最初の描画から元の位置(に並ぶスケルトン)が表示される。
 *
 * 復元の進め方:
 *   リロード直後の文書は、クライアント側で取得するデータが揃う前なので離脱時より短い
 *   ことがある。そのまま当てると位置がスクロール上限で切り詰められ、その後データが届いて
 *   伸びたときにずれる。そのため文書が伸びるのを追いかけ、目的の位置に届いて高さが
 *   落ち着くまで毎フレーム当て直す。ユーザーが自分で操作したら即座に打ち切る。
 *
 * 復元中は再読み込みボタン(ReloadButton)を押せなくする:
 *   途中で再読み込みすると、戻している途中の位置(文書が伸びきる前に切り詰められた位置)が
 *   保存され、次の読み込みでそこへ戻ってしまう。復元中は <html> に RELOAD_RESTORING_ATTR を
 *   付け、終わったら外して RELOAD_RESTORE_END_EVENT を投げるので、ボタンはそれを購読する。
 *   ブラウザ自体の再読み込み(Safari のタブ、PC の F5)は止められないので、保存側でも
 *   復元中なら目標の位置を書く(saveScrollForReload)。
 */

// リロード直前のスクロール位置の保存先。
// タブを閉じれば消えてほしいので localStorage ではなく sessionStorage を使う。
export const RELOAD_SCROLL_KEY = "vsrecorder:scroll-before-unload";

// インラインスクリプトが復元を始めたときに <html> へ付ける目印。
// useScrollResetOnNavigation は、これがあると初回の先頭リセットを見送る(読んだら消す)。
export const RELOAD_RESTORE_ATTR = "data-reload-scroll-restore";

// 復元の最中だけ <html> に付ける目印。値は戻そうとしている位置。
export const RELOAD_RESTORING_ATTR = "data-reload-scroll-restoring";

// 再読み込みボタンに付ける目印。そこへの click では復元を打ち切らない
export const RELOAD_BUTTON_ATTR = "data-reload-button";

// 復元が終わった(打ち切りを含む)ときに window へ投げるイベント
export const RELOAD_RESTORE_END_EVENT = "vsrecorder:reload-scroll-restore-end";

// 復元を諦めるまでの時間(HTML の解析開始から数える)。
// この間に文書が目的の高さまで伸びなければ、届いたところまでで打ち切る。
// ハイドレーションとデータ取得の後で高さが変わるのを追いかけられるよう、
// iOS の PWA で JS の読み込みが遅い場合も見込んで長めにとる。
export const RELOAD_RESTORE_TIMEOUT_MS = 5000;

// 文書の高さが何フレーム変わらなければ「伸びきった」とみなすか。
// 目的地に着いた時点で監視をやめると、その後の伸長で位置がずれるため、
// 高さが落ち着くまで当て直しを続ける。
export const RELOAD_RESTORE_STABLE_FRAMES = 10;

type SavedScroll = {
  href: string;
  y: number;
};

// sessionStorage はプライベートモードや容量超過で例外を投げることがある。
// スクロール位置は失っても実害が無いので、失敗は握りつぶす。
//
// 復元の最中は、今の位置ではなく戻そうとしている位置を書く。今の位置は文書が伸びきる前に
// 切り詰められた途中の値であることがあり、それを残すと次の読み込みでそこへ戻ってしまう。
export function saveScrollForReload() {
  try {
    const restoring = Number(
      document.documentElement.getAttribute(RELOAD_RESTORING_ATTR) ?? Number.NaN,
    );
    const y = Number.isFinite(restoring) ? restoring : window.scrollY;
    const value: SavedScroll = { href: window.location.href, y };
    sessionStorage.setItem(RELOAD_SCROLL_KEY, JSON.stringify(value));
  } catch {
    // 無視
  }
}

// インラインスクリプトが今回の読み込みで復元を始めたか。目印は読んだら消す
// (呼び出し側が万一再マウントしても、別のページで先頭リセットを見送らないように)。
export function consumeReloadRestoreStarted(): boolean {
  const html = document.documentElement;
  const started = html.hasAttribute(RELOAD_RESTORE_ATTR);
  html.removeAttribute(RELOAD_RESTORE_ATTR);
  return started;
}

// 復元の最中か(ReloadButton が押せなくするのに使う)
export function isReloadRestoring(): boolean {
  return document.documentElement.hasAttribute(RELOAD_RESTORING_ATTR);
}

// 復元の終わりを購読する(useClientValue の subscribe に渡す)
export function subscribeReloadRestoreEnd(onChange: () => void): () => void {
  window.addEventListener(RELOAD_RESTORE_END_EVENT, onChange);
  return () => window.removeEventListener(RELOAD_RESTORE_END_EVENT, onChange);
}

/*
 * ペイント前に走らせる復元スクリプト。
 *
 * - 今回の読み込みがリロードのときだけ動く。戻る/進むによる文書の再読み込み
 *   ("back_forward")は従来どおり先頭に倒す(useScrollResetOnNavigation の方針)。
 * - 保存した URL と一致しない場合(別ページを開き直した等)は持ち込まない。
 *   復元中にリダイレクト等で URL が変わった場合も打ち切る。
 * - scrollRestoration を manual にするのは、ブラウザ自身の復元と競合させないため
 *   (理由は useScrollResetOnNavigation のコメントを参照)。
 * - 高さが変わったときだけでなく、位置が目標から外れたときも当て直す。
 *   iOS にはスクロールアンカリングが無く、Chromium ではアンカリングが逆に位置を動かすため、
 *   どちらでも「目標と違えば戻す」で揃える。
 * - scrollTo は2引数の形で呼ぶ(scroll-behavior を指定していないので即時に動く)。
 *   options の behavior:'instant' は古い Safari が知らない値で、例外になりうるため避ける。
 *   rAF の中の例外は外側の try では捕まらないので、ループ本体も個別に包んで打ち切る。
 * - ユーザーの操作で打ち切る対象は「スクロール操作」と「何かを押した」とき。
 *   wheel / touchmove / keydown と、マウスでのスクロールバー操作(<html> への pointerdown)、
 *   それに click(capture で拾う)。touchstart では打ち切らない: 押せなくした再読み込みボタンに
 *   触れただけで復元が止まり、途中の位置に取り残されるため。無効なボタンには click が
 *   発生しないので、そこに触れても復元は続く(念のため無効なボタンへの click も無視する)。
 *   再読み込みボタン自身への click も無視する。ハイドレーション前のボタンは無効になって
 *   おらず、そこへのタップは click になるうえ、React がハイドレーション後に送り直してくる
 *   (ボタン側は押された時点で復元中なら何もしないので、復元を止める理由が無い)。
 * - モーダルが開いたら(react-aria が <html> を overflow:hidden にする)打ち切る。
 *   背面固定(useModalBackgroundScrollLock)がその時点の位置を保持して閉じたときに戻すので、
 *   ここで当て直すと干渉する。
 */
export function reloadScrollRestoreScript(): string {
  return (
    "(function(){try{" +
    "var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];" +
    "if(!nav||nav.type!=='reload')return;" +
    "var s=JSON.parse(sessionStorage.getItem(" +
    JSON.stringify(RELOAD_SCROLL_KEY) +
    ")||'null');" +
    "if(!s||s.href!==location.href||typeof s.y!=='number'||!(s.y>0))return;" +
    "if('scrollRestoration' in history)history.scrollRestoration='manual';" +
    "var de=document.documentElement;" +
    "de.setAttribute(" +
    JSON.stringify(RELOAD_RESTORE_ATTR) +
    ",'');" +
    "de.setAttribute(" +
    JSON.stringify(RELOAD_RESTORING_ATTR) +
    ",String(s.y));" +
    "var y=s.y,href=s.href,deadline=Date.now()+" +
    RELOAD_RESTORE_TIMEOUT_MS +
    ",last=-1,stable=0,stopped=false,id=0;" +
    "function onPointer(e){if(e.pointerType==='mouse'&&e.target===de)stop();}" +
    "function onClick(e){var t=e.target;if(t&&t.closest&&t.closest(" +
    JSON.stringify(`button[disabled],[${RELOAD_BUTTON_ATTR}]`) +
    "))return;stop();}" +
    "var on={wheel:stop,touchmove:stop,keydown:stop,click:onClick,pointerdown:onPointer};" +
    "function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(id);" +
    "for(var k in on)window.removeEventListener(k,on[k],true);" +
    "de.removeAttribute(" +
    JSON.stringify(RELOAD_RESTORING_ATTR) +
    ");" +
    "try{window.dispatchEvent(new Event(" +
    JSON.stringify(RELOAD_RESTORE_END_EVENT) +
    "));}catch(e){}}" +
    "for(var k in on)window.addEventListener(k,on[k],{capture:true,passive:true});" +
    "function step(){if(stopped)return;try{" +
    "if(location.href!==href||Date.now()>deadline||de.style.overflow==='hidden'){stop();return;}" +
    "var h=de.scrollHeight;" +
    "if(h!==last){last=h;stable=0;}else{stable++;}" +
    "var to=Math.min(y,Math.max(0,h-de.clientHeight));" +
    "if(Math.abs(window.scrollY-to)>=1)window.scrollTo(0,to);" +
    "if(Math.round(window.scrollY)>=Math.round(y)&&stable>=" +
    RELOAD_RESTORE_STABLE_FRAMES +
    "){stop();return;}" +
    "id=requestAnimationFrame(step);}catch(e){stop();}}" +
    "id=requestAnimationFrame(step);" +
    // 途中で失敗したら目印を残さない(残ると再読み込みボタンが押せないままになる)
    "}catch(e){try{document.documentElement.removeAttribute(" +
    JSON.stringify(RELOAD_RESTORING_ATTR) +
    ");}catch(_){}}})();"
  );
}
