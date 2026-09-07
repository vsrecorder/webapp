"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
import {
  DASHBOARD_LAYOUT_COOKIE,
  DASHBOARD_LAYOUT_COOKIE_MAX_AGE,
  DashboardBlockId,
  initialSectionStateFromLayout,
  isDashboardBlockId,
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
};

function loadLayout(defaultOrder: string[]): Required<StoredLayout> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: defaultOrder, hidden: [], shown: [] };

    const parsed = JSON.parse(raw) as StoredLayout;
    // 未知のIDを除外しつつ、新しく増えたセクションは末尾に追加する
    const known = new Set(defaultOrder);
    const order = parsed.order.filter((id) => known.has(id));
    const missing = defaultOrder.filter((id) => !order.includes(id));

    return {
      order: [...order, ...missing],
      hidden: (parsed.hidden ?? []).filter((id) => known.has(id)),
      shown: (parsed.shown ?? []).filter((id) => known.has(id)),
    };
  } catch {
    return { order: defaultOrder, hidden: [], shown: [] };
  }
}

function saveLayout(layout: StoredLayout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

function loadOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveOnboardingComplete(complete: boolean) {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, complete ? "1" : "0");
  } catch {
    // localStorage が使えない環境では自動非表示のキャッシュを諦める(致命的ではない)
  }
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

  const [order, setOrder] = useState<string[]>(initialFromCookie?.order ?? defaultOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialFromCookie?.hidden ?? []));
  // ユーザーが「既定は非表示」の節(全達成した「はじめの一歩」)を明示的にONにした記録。
  const [shown, setShown] = useState<Set<string>>(new Set());
  // 「はじめの一歩」を全達成済みか。全達成なら onboarding_badges を既定で非表示にする。
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  // 保存済みのカスタムレイアウトは localStorage からしか読めずSSR/初回描画時点では
  // 分からないため、読み込み前にデフォルト順で描画してしまうとその直後に保存済みの
  // 順序へ切り替わり一瞬ちらつく。読み込みが終わるまではセクション本体を描画せず、
  // ちらつきを回避する。ただし cookie に前回の並びがあるときは、それが保存済みの設定と
  // 同じ結果になる(同じ端末で毎回書き替えている)ので、最初から本体を描く。
  const [isLayoutReady, setIsLayoutReady] = useState(initialFromCookie != null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const layout = loadLayout(sections.map((s) => s.id));
    setOrder(layout.order);
    setHidden(new Set(layout.hidden));
    setShown(new Set(layout.shown));
    // 全達成はキャッシュから即反映し、初回描画からちらつかせない。
    setOnboardingComplete(loadOnboardingComplete());
    setIsLayoutReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 「はじめの一歩」の全達成を判定する。判定にはバッジ一覧が要るが、これは
  // OnboardingBadgePanel の表示用取得とは独立(達成判定だけが目的)。取得できたら
  // 真偽を確定し、次回訪問のためにキャッシュする。失敗時は現状維持(勝手にパネルを
  // 消さない方が安全)。
  useEffect(() => {
    let cancelled = false;

    // 全達成かどうかを、バッジ一覧から決めて次回訪問のために覚えておく
    const settle = (data: UserBadgesType) => {
      const onboarding = (data?.badges ?? []).filter((b) => b.category === "onboarding");
      const complete = onboarding.length > 0 && onboarding.every((b) => b.achieved);

      if (cancelled) return;
      setOnboardingComplete(complete);
      saveOnboardingComplete(complete);
    };

    // サーバ描画で取れていればそれで判定する(取りに行かない)
    if (initialBadges) {
      settle(initialBadges);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/badges`, { cache: "no-store" });
        if (!res.ok) return;

        settle((await res.json()) as UserBadgesType);
      } catch {
        // ネットワークエラー時は判定を変えない
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, initialBadges]);

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

    setHidden(nextHidden);
    setShown(nextShown);
    saveLayout({
      order,
      hidden: Array.from(nextHidden),
      shown: Array.from(nextShown),
    });
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      saveLayout({
        order: next,
        hidden: Array.from(hidden),
        shown: Array.from(shown),
      });
      return next;
    });
  }

  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    setOrder(defaultOrder);
    setHidden(new Set());
    setShown(new Set());
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
   * 本日のシティリーグや対戦環境データのようにサーバ側の取得結果で出方が変わる節も、
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
