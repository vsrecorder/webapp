import { SetStateAction, Dispatch, useEffect, useRef } from "react";

import { useRouter } from "next/navigation";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CreateMatchModal from "@app/components/organisms/Match/Modal/CreateMatchModal";
import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";
import { readSessionStorage, writeSessionStorage } from "@app/utils/sessionStorageStore";

type Props = {
  record: RecordGetByIdResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  // 横幅いっぱい＋縦を高めにして表示するか(戦績カード内のパネル下部で使用)
  fullWidth?: boolean;
};

export default function CreateMatchModalButton({
  record,
  setMatches,
  fullWidth = false,
}: Props) {
  const {
    isOpen: isOpenForCreateMatchModal,
    onOpen: onOpenForCreateMatchModal,
    onOpenChange: onOpenChangeForCreateMatchModal,
    onClose: onCloseForCreateMatchModal,
  } = useDisclosure();

  const router = useRouter();

  // このボタンから対戦を足したか。閉じたときに1回だけ取り直しを促すために持つ
  const addedRef = useRef(false);

  /*
   * 閉じたら、戻った先のサーバ側のデータを取り直させる。
   *
   * Next のクライアントキャッシュ(staleTimes.dynamic = 15秒)が効くため、追記の直後に
   * ホームや記録一覧へ戻ると、増える前の勝敗数がそのまま出る。ホームの「記録中」カードは
   * 戦績を見せる面なので、ここが古いと「記録したのに増えない」と映る。
   *
   * 追記のたびではなく閉じたときに1回だけにするのは、「続けて対戦結果を追加する」で
   * フォームを開いたままにしている最中に取り直すと、入力中のモーダルを巻き込むため。
   * 閉じ方(ボタン・スワイプ・Esc)によらず効くよう、開閉の状態から判断する。
   */
  useEffect(() => {
    if (isOpenForCreateMatchModal) return;
    if (!addedRef.current) return;

    addedRef.current = false;
    router.refresh();
  }, [isOpenForCreateMatchModal, router]);

  /*
   * 他の画面から「この記録の対戦を足しに来た」と指示されていれば、着いた時点で開く。
   * いまのところホームの「記録中」カードだけが立てる(utils/createMatchIntent)。
   *
   * 指示は読んだ時点で消す。残すと、モーダルを閉じて再読み込みしたときや
   * 戻り遷移で戻ってきたときに、また開いてしまう。
   * record が揃うまで待つのは、モーダルが記録の内容(レギュレーション・集計対象か)を
   * 使うため。対戦一覧の取得が終わってからこのボタン自体が現れるので、実質1回で足りる。
   */
  useEffect(() => {
    if (!record) return;
    if (readSessionStorage(OPEN_CREATE_MATCH_RECORD_ID) !== record.id) return;

    writeSessionStorage(OPEN_CREATE_MATCH_RECORD_ID, null);
    onOpenForCreateMatchModal();
    // onOpen は useDisclosure が返す安定した関数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  return (
    <>
      <Button
        size="sm"
        radius="full"
        fullWidth={fullWidth}
        className={fullWidth ? "h-10" : ""}
        onPress={onOpenForCreateMatchModal}
      >
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${fullWidth ? "text-sm" : "text-tiny"}`}>
            <LuCirclePlus />
          </span>
          <span className={`font-bold ${fullWidth ? "text-sm" : ""}`}>
            対戦結果を追加する
          </span>
        </div>
      </Button>

      <CreateMatchModal
        record={record}
        setMatches={(update) => {
          addedRef.current = true;
          setMatches(update);
        }}
        isOpen={isOpenForCreateMatchModal}
        onOpenChange={onOpenChangeForCreateMatchModal}
        onClose={onCloseForCreateMatchModal}
      />
    </>
  );
}
