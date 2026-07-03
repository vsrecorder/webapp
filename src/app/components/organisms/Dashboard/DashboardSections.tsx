"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch,
  useDisclosure,
} from "@heroui/react";
import { LuChevronUp, LuChevronDown } from "react-icons/lu";

// ヘッダーのユーザメニュー「ダッシュボード表示設定」から遷移してきた際に付与されるクエリパラメータ
export const CUSTOMIZE_QUERY_PARAM = "customize";

export type DashboardSection = {
  id: string;
  label: string;
  node: ReactNode;
};

type Props = {
  pinned?: ReactNode;
  sections: DashboardSection[];
  trailing?: ReactNode;
};

const STORAGE_KEY = "dashboard_layout_v1";

type StoredLayout = {
  order: string[];
  hidden: string[];
};

function loadLayout(defaultOrder: string[]): StoredLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: defaultOrder, hidden: [] };

    const parsed = JSON.parse(raw) as StoredLayout;
    // 未知のIDを除外しつつ、新しく増えたセクションは末尾に追加する
    const known = new Set(defaultOrder);
    const order = parsed.order.filter((id) => known.has(id));
    const missing = defaultOrder.filter((id) => !order.includes(id));

    return {
      order: [...order, ...missing],
      hidden: parsed.hidden.filter((id) => known.has(id)),
    };
  } catch {
    return { order: defaultOrder, hidden: [] };
  }
}

function saveLayout(layout: StoredLayout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export default function DashboardSections({ pinned, sections, trailing }: Props) {
  const defaultOrder = sections.map((s) => s.id);

  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const layout = loadLayout(sections.map((s) => s.id));
    setOrder(layout.order);
    setHidden(new Set(layout.hidden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ヘッダーのユーザメニューから ?customize=1 付きで遷移してきたらモーダルを開く
  useEffect(() => {
    if (searchParams.get(CUSTOMIZE_QUERY_PARAM) === "1") {
      onOpen();
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function toggleHidden(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveLayout({ order, hidden: Array.from(next) });
      return next;
    });
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      saveLayout({ order: next, hidden: Array.from(hidden) });
      return next;
    });
  }

  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    setOrder(defaultOrder);
    setHidden(new Set());
  }

  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const orderedSections = order
    .map((id) => sectionMap.get(id))
    .filter((s): s is DashboardSection => !!s);

  return (
    <>
      {pinned && (
        <div className="mb-3 lg:mb-6 lg:break-inside-avoid-column">{pinned}</div>
      )}

      <div className="lg:columns-2 lg:gap-6">
        {orderedSections
          .filter((s) => !hidden.has(s.id))
          .map((s) => (
            <div key={s.id} className="mb-3 lg:mb-6 lg:break-inside-avoid-column">
              {s.node}
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
                        size="sm"
                        isSelected={!hidden.has(s.id)}
                        onValueChange={() => toggleHidden(s.id)}
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
