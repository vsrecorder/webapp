"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch,
  useDisclosure,
} from "@heroui/react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import DashboardBlockSkeleton from "@app/components/organisms/Dashboard/Skeleton/DashboardSectionSkeletons";
import { UserBadgesType } from "@app/types/badge";
import { writeClientCookie } from "@app/utils/clientCookie";
import { writeLocalStorage } from "@app/utils/localStorageStore";
import { useHydrated } from "@app/hooks/useHydrated";
import { useLocalStorageItem } from "@app/hooks/useLocalStorageItem";
import {
  applyOrderMigrations,
  DASHBOARD_LAYOUT_COOKIE,
  DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  DASHBOARD_ORDER_VERSION,
  DashboardBlockId,
  initialSectionStateFromLayout,
  isDashboardBlockId,
  mergeIntoStoredOrder,
  serializeDashboardLayout,
} from "@app/utils/dashboardLayout";

// ヘッダーのユーザメニュー「ダッシュボード表示設定」から遷移してきた際に付与されるクエリパラメータ
export const CUSTOMIZE_QUERY_PARAM = "customize";

export type DashboardSection = {
  id: string;
  label: string;
  node: ReactNode;
  /*
   * 骨格(DashboardSkeleton)で使うブロックID。省略時は id をそのまま使う。
   *
   * 分けているのは「対戦環境データ」だけ。この節は記録件数で中身(従来パネル/組み合わせパネル)が
   * 入れ替わるので骨格も2種類あるが、id は並べ替え・非表示設定(localStorage)のキーでもあり、
   * 変えるとユーザーの設定が未知のID扱いになって並びが崩れる。
   */
  skeletonId?: DashboardBlockId;
};

type Props = {
  userId: string;
  pinned?: ReactNode;
  // pinned に実際に並べたカードのID(骨格の並びを cookie に残すために使う)
  pinnedIds?: readonly DashboardBlockId[];
  sections: DashboardSection[];
  trailing?: ReactNode;
  // trailing のID(同上)
  trailingId?: DashboardBlockId;
  /*
   * 前回このユーザーのホームが描いた並びのうち、多段組に入る節ぶん(cookie 由来)。
   * 保存済みの表示設定を読むまでの繋ぎに、この構成で骨格を出す。
   */
  initialSectionLayout?: readonly DashboardBlockId[];
  // サーバ描画(dashboardServer)で取った全バッジ。あればこれで達成判定し、取りに行かない
  initialBadges?: UserBadgesType;
};

const STORAGE_KEY = "dashboard_layout_v1";
// 「はじめの一歩」を全達成済みかどうかのキャッシュ。全達成は永続情報(一度取れたら
// 二度と外れない)なので、再訪時にバッジ取得の完了を待たずに即座に既定非表示へ反映して
// ちらつきを防ぐために保持する。取得成功時に真偽を上書きする(別アカウントで false に
// 戻るケースにも対応)。
const ONBOARDING_COMPLETE_KEY = "dashboard_onboarding_complete_v1";
// 全達成したら既定で非表示にする節。表示設定でユーザーが明示的にONにすれば上書きできる。
const ONBOARDING_SECTION_ID = "onboarding_badges";

type StoredLayout = {
  order: string[];
  hidden: string[];
  // 自動非表示(全達成した「はじめの一歩」など)を、ユーザーが明示的に再表示した節。
  // 「既定は非表示だが、本人がONにしたら表示し続ける」を成立させるための上書き記録。
  shown?: string[];
  /*
   * この並びに適用済みの「一度きりの並び直し」の版(utils/dashboardLayout)。
   * 無い＝その仕組みができる前に保存された値。保存時は必ず現在の版を付ける。
   */
  orderVersion?: number;
};

/*
 * 保存値(localStorage の生の JSON)を並び・非表示・明示表示へ戻す。
 *
 * 未知のIDは落とし、保存値に無い節は既定の位置へ差し込む(mergeIntoStoredOrder)。
 * 末尾に足すと、あとから増えた節が既存ユーザーにだけホーム・表示設定の最下部に出る。
 * すでに保存値へ入っている節の位置は動かせないので、そちらは版付きの並び直し
 * (applyOrderMigrations)で一度だけ直す。
 */
function parseLayout(raw: string | null, defaultOrder: string[]): Required<StoredLayout> {
  try {
    if (!raw) {
      // 未保存。並び直しの対象が無いので、現在の版が入っている扱いにする
      return {
        order: defaultOrder,
        hidden: [],
        shown: [],
        orderVersion: DASHBOARD_ORDER_VERSION,
      };
    }

    const parsed = JSON.parse(raw) as StoredLayout;
    const known = new Set(defaultOrder);

    return {
      order: applyOrderMigrations(
        mergeIntoStoredOrder(parsed.order ?? [], defaultOrder),
        parsed.orderVersion,
      ),
      hidden: (parsed.hidden ?? []).filter((id) => known.has(id)),
      shown: (parsed.shown ?? []).filter((id) => known.has(id)),
      orderVersion: parsed.orderVersion ?? 0,
    };
  } catch {
    return {
      order: defaultOrder,
      hidden: [],
      shown: [],
      orderVersion: DASHBOARD_ORDER_VERSION,
    };
  }
}

// 保存はここに集約する。適用済みの版を必ず付け、次回の読み込みで並びが巻き戻らないようにする
function saveLayout(layout: Omit<StoredLayout, "orderVersion">) {
  writeLocalStorage(
    STORAGE_KEY,
    JSON.stringify({ ...layout, orderVersion: DASHBOARD_ORDER_VERSION }),
  );
}

// localStorage が使えない環境では自動非表示のキャッシュを諦める(致命的ではない)
function saveOnboardingComplete(complete: boolean) {
  writeLocalStorage(ONBOARDING_COMPLETE_KEY, complete ? "1" : "0");
}

// 「はじめの一歩」を全達成しているか(バッジ一覧から判定する)
function isOnboardingComplete(data: UserBadgesType): boolean {
  const onboarding = (data?.badges ?? []).filter((b) => b.category === "onboarding");
  return onboarding.length > 0 && onboarding.every((b) => b.achieved);
}

export default function DashboardSections({
  userId,
  pinned,
  pinnedIds,
  sections,
  trailing,
  trailingId,
  initialSectionLayout,
  initialBadges,
}: Props) {
  const defaultOrder = sections.map((s) => s.id);
  // cookie が無いときの繋ぎの骨格。今まさに描こうとしている節の並びをそのまま使う
  const defaultSkeletonIds = sections
    .map((s) => s.skeletonId ?? s.id)
    .filter(isDashboardBlockId);

  /*
   * 前回描いた並び(cookie)があれば、それを初期状態にしてサーバ描画の時点から節の本体を出す。
   * 無ければ localStorage を読み終わるまで骨格で繋ぐ(initialSectionStateFromLayout 参照)。
   * useState の初期化子はサーバとハイドレーションで同じ値になる(props からしか決めない)。
   */
  const [initialFromCookie] = useState(() =>
    initialSectionStateFromLayout(initialSectionLayout, defaultOrder),
  );

  /*
   * 保存済みのカスタムレイアウト(並び・非表示・明示表示)は localStorage からしか読めず、
   * SSR/ハイドレーションの時点では分からない。読み込み前にデフォルト順で描画してしまうと
   * その直後に保存済みの順序へ切り替わり一瞬ちらつく。そこでハイドレーションが済むまでは
   * セクション本体を描画せず(骨格で繋ぎ)、ちらつきを回避する。ただし cookie に前回の並びが
   * あるときは、それが保存済みの設定と同じ結果になる(同じ端末で毎回書き替えている)ので、
   * 最初から本体を描く。
   *
   * 保存値は localStorage を「外部ストア」として描画中に読む(useLocalStorageItem)。
   * 並べ替えや表示設定の変更はストアへ書き(saveLayout)、その通知で描画が追随する。
   */
  const hydrated = useHydrated();
  const storedLayout = useLocalStorageItem(STORAGE_KEY);
  const defaultOrderKey = defaultOrder.join(",");
  const savedLayout = useMemo(
    () => parseLayout(storedLayout, defaultOrderKey ? defaultOrderKey.split(",") : []),
    [storedLayout, defaultOrderKey],
  );
  const isLayoutReady = hydrated || initialFromCookie != null;
  // ハイドレーション前は cookie 由来の並び(無ければ既定順)で描く
  const cookieLayout = useMemo<Required<StoredLayout>>(
    () => ({
      order: initialFromCookie?.order ?? (defaultOrderKey ? defaultOrderKey.split(",") : []),
      hidden: initialFromCookie?.hidden ?? [],
      shown: [],
      orderVersion: DASHBOARD_ORDER_VERSION,
    }),
    [initialFromCookie, defaultOrderKey],
  );
  const layout = hydrated ? savedLayout : cookieLayout;
  const order = layout.order;
  const hidden = useMemo(() => new Set(layout.hidden), [layout]);
  // ユーザーが「既定は非表示」の節(全達成した「はじめの一歩」)を明示的にONにした記録。
  const shown = useMemo(() => new Set(layout.shown), [layout]);

  // 「はじめの一歩」を全達成済みか。全達成なら onboarding_badges を既定で非表示にする。
  // 全達成は永続情報なので localStorage のキャッシュから即反映し、初回描画からちらつかせない。
  // バッジ一覧(サーバ描画の initialBadges か、無ければここで取る)が届いたらその判定で上書きする
  const cachedOnboardingComplete = useLocalStorageItem(ONBOARDING_COMPLETE_KEY) === "1";
  const [fetchedBadges, setFetchedBadges] = useState<UserBadgesType | null>(null);
  const badges = initialBadges ?? fetchedBadges;
  const onboardingComplete = badges ? isOnboardingComplete(badges) : cachedOnboardingComplete;
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 「はじめの一歩」の全達成を判定するためのバッジ一覧。判定にはバッジ一覧が要るが、これは
  // OnboardingBadgePanel の表示用取得とは独立(達成判定だけが目的)。サーバ描画で取れていれば
  // 取りに行かない。失敗時は現状維持(勝手にパネルを消さない方が安全)。
  useEffect(() => {
    if (initialBadges) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/badges`, { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as UserBadgesType;
        if (!cancelled) setFetchedBadges(data);
      } catch {
        // ネットワークエラー時は判定を変えない
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, initialBadges]);

  // 判定が確定したら次回訪問のためにキャッシュする(別アカウントで false に戻るケースにも対応)
  useEffect(() => {
    if (badges) saveOnboardingComplete(isOnboardingComplete(badges));
  }, [badges]);

  /*
   * 版付きの並び直し(applyOrderMigrations)を適用した結果を、一度だけ保存し直す。
   *
   * 読み込み時に直すだけだと版が古いままなので、次に開いたときも同じ並び直しが走り、
   * ユーザーが自分で動かした位置を毎回巻き戻してしまう。ここで現在の版を付けて保存すれば、
   * 直すのは一度きりになる。未保存(storedLayout が null)なら直すものが無いので何もしない。
   */
  useEffect(() => {
    if (!hydrated || storedLayout == null) return;
    if (savedLayout.orderVersion >= DASHBOARD_ORDER_VERSION) return;

    saveLayout({
      order: savedLayout.order,
      hidden: savedLayout.hidden,
      shown: savedLayout.shown,
    });
  }, [hydrated, storedLayout, savedLayout]);

  // ヘッダーのユーザメニューから ?customize=1 付きで遷移してきたらモーダルを開く
  useEffect(() => {
    if (searchParams.get(CUSTOMIZE_QUERY_PARAM) === "1") {
      onOpen();
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 全達成時に既定で非表示にする節の一覧。ユーザーが shown で明示的にONにしていれば表示する。
  const autoHiddenIds = onboardingComplete ? [ONBOARDING_SECTION_ID] : [];

  // 節が今表示すべきでない(非表示)か。明示的な非表示、または「既定非表示かつ本人がONにしていない」。
  function isHidden(id: string): boolean {
    if (hidden.has(id)) return true;
    if (autoHiddenIds.includes(id) && !shown.has(id)) return true;
    return false;
  }

  // 表示設定のスイッチ。表示⇔非表示を、自動非表示を上書きできる形で明示選択として記録する。
  // 保存すると(ストアの通知で)描画が追随する
  function toggleVisibility(id: string) {
    const nextHidden = new Set(hidden);
    const nextShown = new Set(shown);

    if (isHidden(id)) {
      // → 表示する
      nextHidden.delete(id);
      // 既定非表示の節は、ONにした事実を残さないと次の描画で再び自動非表示になる
      if (autoHiddenIds.includes(id)) {
        nextShown.add(id);
      }
    } else {
      // → 非表示にする
      nextShown.delete(id);
      nextHidden.add(id);
    }

    saveLayout({
      order,
      hidden: Array.from(nextHidden),
      shown: Array.from(nextShown),
    });
  }

  function move(id: string, direction: -1 | 1) {
    const index = order.indexOf(id);
    const nextIndex = index + direction;
    if (index === -1 || nextIndex < 0 || nextIndex >= order.length) return;

    const next = [...order];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    saveLayout({
      order: next,
      hidden: Array.from(hidden),
      shown: Array.from(shown),
    });
  }

  function resetLayout() {
    writeLocalStorage(STORAGE_KEY, null);
  }

  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const orderedSections = order
    .map((id) => sectionMap.get(id))
    .filter((s): s is DashboardSection => !!s);
  const visibleSections = orderedSections.filter((s) => !isHidden(s.id));

  /*
   * 次回のホームの骨格(DashboardSkeleton)を同じ構成で出せるよう、実際に描いた並びを cookie に残す。
   *
   * 並べ替え・非表示の設定(localStorage)はサーバから読めないので、骨格はこれが無いと
   * 全員に同じ形しか出せない。覚えるのは「設定」ではなく「描いた結果」——そうすると、
   * 本日のシティリーグ結果や対戦環境データのようにサーバ側の取得結果で出方が変わる節も、
   * 骨格側が理由を知らないまま同じ形で再現できる。
   */
  const savedLayoutRef = useRef<string | null>(null);

  useEffect(() => {
    // 保存済みの並びを読む前(既定順のまま)に書くと、次回の骨格が既定順で固定されてしまう
    if (!isLayoutReady) return;

    const ids = [
      ...(pinnedIds ?? []),
      ...visibleSections.map((s) => s.skeletonId ?? s.id),
      ...(trailing != null && trailingId != null ? [trailingId] : []),
    ].filter(isDashboardBlockId);

    const value = serializeDashboardLayout(ids);
    // 中身が変わらない再描画で document.cookie を触らない
    if (savedLayoutRef.current === value) return;

    savedLayoutRef.current = value;
    writeClientCookie(DASHBOARD_LAYOUT_COOKIE, value, DASHBOARD_LAYOUT_COOKIE_MAX_AGE);
  });

  return (
    <>
      {pinned && (
        <div className="mb-3 lg:mb-6 lg:break-inside-avoid-column">{pinned}</div>
      )}

      <div className="lg:columns-2 lg:gap-6">
        {isLayoutReady
          ? visibleSections.map((s) => (
              <div key={s.id} className="mb-3 lg:mb-6 lg:break-inside-avoid-column">
                {s.node}
              </div>
            ))
          : /*
               保存済みの表示設定(localStorage)を読むまでの繋ぎ。ここは Suspense の骨格
               (DashboardSkeleton)が消えた直後に出るので、同じ構成・同じ骨格を出して
               形が変わらないようにする。並びは cookie 由来(initialSectionLayout)で、
               無ければ既定順のまま出す。
            */
            (initialSectionLayout ?? defaultSkeletonIds).map((id) => (
              <div key={id} className="mb-3 lg:mb-6 lg:break-inside-avoid-column">
                <DashboardBlockSkeleton id={id} />
              </div>
            ))}
      </div>

      {trailing && (
        <div className="mt-3 lg:mt-6 lg:break-inside-avoid-column">{trailing}</div>
      )}

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 px-3">表示設定</ModalHeader>
              <ModalBody className="px-3 py-1 gap-1">
                {orderedSections.map((s, index) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-default-100"
                  >
                    <span className="text-sm font-medium text-default-700 truncate">
                      {s.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        isDisabled={index === 0}
                        onPress={() => move(s.id, -1)}
                        aria-label={`${s.label}を上に移動`}
                      >
                        <LuChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        isDisabled={index === orderedSections.length - 1}
                        onPress={() => move(s.id, 1)}
                        aria-label={`${s.label}を下に移動`}
                      >
                        <LuChevronDown className="w-4 h-4" />
                      </Button>
                      <Switch
                        name={`dashboard-section-visible-${s.id}`}
                        size="sm"
                        isSelected={!isHidden(s.id)}
                        onValueChange={() => toggleVisibility(s.id)}
                        aria-label={`${s.label}を表示する`}
                      />
                    </div>
                  </div>
                ))}
              </ModalBody>
              <ModalFooter className="justify-between">
                <Button
                  color="default"
                  variant="light"
                  onPress={resetLayout}
                  className="font-bold"
                >
                  デフォルトに戻す
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={onClose}
                  className="font-bold"
                >
                  閉じる
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
