"use client";

import { useEffect } from "react";
import {
  MODAL_HISTORY_DEPTH_KEY,
  markModalHistoryPop,
  readModalHistoryDepth,
} from "@app/utils/modalHistory";

/*
 * モーダル表示中のブラウザバック(iOS のスワイプバック含む)で、ページを戻す代わりに
 * モーダルを閉じるグローバル対策。
 *
 * 前提として、ブラウザバック自体を阻止する手段は存在しない(ページ離脱の
 * beforeunload と違い、履歴移動をブロックする API は無い)。そのため
 * 「モーダルを開くときに戻り先の履歴エントリを1つ積んでおき、バックでそれを
 * 消費させる」という形で実現する。ユーザーから見ると、バックでモーダルだけが
 * 閉じてページはそのまま残る。
 *
 * 閉じ方:
 *   最前面のモーダルに Escape の keydown を送る。HeroUI(useAriaOverlay)の Escape 処理は
 *   aria-modal を持つ要素自身の onKeyDown なので、閉じるボタンを押したときと
 *   まったく同じ経路(state.close → onOpenChange → onClose)を通る。各モーダルが
 *   onClose に持たせている後始末もそのまま走るため、個々のモーダルへの変更は要らない。
 *   入れ子になっている場合は react-aria 側が最前面の1枚だけを閉じる。
 *   isKeyboardDismissDisabled(送信中は閉じさせない等)を指定したモーダルは閉じないが、
 *   それは意図された設定なので尊重し、消費された戻り先を積み直す。
 *
 * 履歴の目印:
 *   積んだエントリの history.state に「その時点で開いているモーダルの枚数」を入れる。
 *   これを実際に開いている枚数と突き合わせることで、バック・UI 操作での閉じ・入れ子の
 *   増減を一つのロジックで扱える。
 *   なお state には現在の state を必ず引き継ぐ。Next.js の App Router は popstate で
 *   __NA を持たないエントリに着地するとページをリロードしてしまうため、この引き継ぎが
 *   無いと「バックでモーダルを閉じたつもりが再読み込み」になる。
 *   URL は変えないので、Next.js 側は履歴を積む以外の処理(再取得・再描画)を行わない。
 *
 * 他の履歴処理との関係:
 *   pushState を「リンク遷移が起きた」目印にしている箇所(useReopenFlagsOnBack /
 *   RecordById)と、popstate で先頭へスクロールする箇所(useScrollResetOnNavigation)は、
 *   modalHistory.ts の判定でモーダル由来の履歴操作を除外している。
 */

/*
 * 開いているモーダルだけを数えるセレクタ。
 *
 * aria-modal は HeroUI の Modal だけが付ける(Dropdown/Select/Popover は付けない)ため、
 * 非モーダルのポップオーバーを巻き込まない。
 * data-open は state.isOpen が true の間だけ付くので、閉じるアニメーション中で
 * まだ DOM に残っているモーダルは数から外れる。これにより「閉じた直後にバック」で
 * 履歴が余分に戻ってしまうのを防げる。
 */
const OPEN_MODAL_SELECTOR = '[aria-modal="true"][data-open="true"]';

export function useCloseModalOnBack() {
  useEffect(() => {
    const countOpenModals = (): number =>
      document.querySelectorAll(OPEN_MODAL_SELECTOR).length;

    // 今いる履歴エントリが「開いているモーダルの戻り先」として自分が積んだものか。
    // UI 操作で閉じたとき(巻き戻してよい)と、バックで着地しただけのとき
    // (巻き戻すとページが飛ぶ)を区別するために持つ。
    let owned = false;

    // 自分で history.go() したぶんの popstate 待ち数。
    let pendingSelfPops = 0;

    // 前回 sync() した時点で開いていた枚数。増えたときだけ戻り先を積むために持つ。
    let lastCount = 0;

    // バックで閉じられなかったモーダルのために、消費された戻り先を積み直す必要があるか。
    let needsRepush = false;

    const setDepth = (depth: number, mode: "push" | "replace") => {
      const state = {
        ...window.history.state,
        [MODAL_HISTORY_DEPTH_KEY]: depth,
      };

      if (mode === "replace") {
        window.history.replaceState(state, "", window.location.href);
      } else {
        window.history.pushState(state, "", window.location.href);
      }
    };

    const closeTopModal = () => {
      const modals = document.querySelectorAll<HTMLElement>(OPEN_MODAL_SELECTOR);

      modals[modals.length - 1]?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    };

    // 開いている枚数と、履歴に積んである戻り先の数を突き合わせて揃える
    const sync = () => {
      const count = countOpenModals();
      const depth = readModalHistoryDepth(window.history.state);

      // 新しくモーダルが開いたか。戻り先を積むのはこの場合(と、バックで閉じられず
      // 積み直しが要る場合)だけに限る。
      //
      // 「開いている枚数が目印より多い」だけを条件にすると、モーダルを開いたまま
      // 別ページへ遷移した瞬間に、まだ消えていないモーダルのために遷移先のページで
      // 戻り先を積んでしまう(実測: 遷移先で余分なエントリが積まれ、バックしても
      // 元のページに戻れなくなる)。
      const opened = count > lastCount;
      const repush = needsRepush;
      lastCount = count;
      needsRepush = false;

      if (count > depth) {
        if (!opened && !repush) {
          // 遷移などで、開いているモーダルがこの履歴エントリのものではない状態。
          // 触らずにモーダルが消えるのを待つ
          owned = false;
          return;
        }

        // 開いている枚数ぶんの戻り先を用意する
        for (let d = depth + 1; d <= count; d++) setDepth(d, "push");
        owned = true;
        return;
      }

      if (count === depth) {
        // 実態と目印が一致している。モーダルが開いていれば、この履歴エントリは
        // 自分の戻り先として使われている状態
        owned = depth > 0;
        return;
      }

      if (owned) {
        // 閉じるボタン・背景タップ・ドラッグなど、バック以外の操作で閉じた。
        // 用意しておいた戻り先を取り除き、履歴にゴミを残さない
        // (残すと、閉じたあとのバックが1回空振りしたように見える)
        owned = false;
        pendingSelfPops++;
        window.history.go(-(depth - count));
        return;
      }

      // 自分が積んだのではない「モーダル用エントリ」に、モーダルを開かずにいる。
      // モーダルを開いたまま別ページへ進み、バックで戻ってきたがモーダルが
      // 再開されなかった場合など。ここで巻き戻すとユーザーの意図に反して
      // ページが飛ぶため、エントリは残したまま目印だけ実態に合わせる。
      // (合わせないと、次にモーダルを開いたとき「戻り先はもうある」と誤認して
      //  用意しなくなり、バックでページごと戻ってしまう)
      setDepth(count, "replace");
    };

    const handlePopState = (event: PopStateEvent) => {
      const depth = readModalHistoryDepth(event.state);
      const count = countOpenModals();

      if (pendingSelfPops > 0) {
        // 自分が取り除いた戻り先の着地。ページ遷移ではないことを他へ伝えるだけ
        pendingSelfPops--;
        markModalHistoryPop(event);
        owned = depth > 0 && count === depth;
        return;
      }

      if (count > depth) {
        // モーダルを開いた状態でのバック。ページは戻さず最前面のモーダルを閉じる
        markModalHistoryPop(event);
        closeTopModal();

        // 閉じられた場合は DOM の変化を MutationObserver が拾って sync() が整合させる。
        // 閉じられなかった場合は DOM が変化せず MutationObserver も発火しないため、
        // React の反映を待ってから自分で確認し、消費された戻り先を積み直す
        needsRepush = true;
        requestAnimationFrame(sync);
        return;
      }

      owned = depth > 0 && count === depth;
    };

    /*
     * モーダルのマウント/アンマウント。
     * HeroUI の Modal は portalContainer 未指定なら body 直下へポータルされるので、
     * body の直接の子だけを見れば足りる(subtree まで広げると無関係な描画で毎回発火する)。
     */
    const portalObserver = new MutationObserver(sync);
    portalObserver.observe(document.body, { childList: true });

    /*
     * data-open の変化。閉じるアニメーションが始まった時点(DOM から消える前)で
     * 閉じたことを検知するために、属性だけを subtree で監視する。
     */
    const openObserver = new MutationObserver(sync);
    openObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-open"],
    });

    // capture フェーズで登録する。window に通常登録されている他の popstate 処理
    // (useScrollResetOnNavigation の先頭スクロール)より先に、
    // 「この popstate はモーダル由来」の印を立てる必要があるため。
    window.addEventListener("popstate", handlePopState, true);

    // リロードでは history.state が保持されるため、前回の目印が残っていることがある。
    // その場合はここで実態(モーダルは開いていない)に合わせておく
    sync();

    return () => {
      portalObserver.disconnect();
      openObserver.disconnect();
      window.removeEventListener("popstate", handlePopState, true);
    };
  }, []);
}
