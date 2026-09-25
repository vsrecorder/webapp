import { SetStateAction, Dispatch, useEffect, useRef, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import { useDisclosure } from "@heroui/react";
import { Button } from "@heroui/react";

import { LuCirclePlus } from "react-icons/lu";

import CreateMatchModal from "@app/components/organisms/Match/Modal/CreateMatchModal";
import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";
import { refreshRecordingNow } from "@app/utils/recordingNowClient";
import { readSessionStorage, writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * 対戦結果を追加するモーダル(と、その上に重ねる環境リターン)の開閉と本体。
 *
 * ボタンとは分けて、対戦一覧(Matches)が常に1つだけ持つ。
 * 以前はボタンの中にモーダルを持たせていたが、一覧は「0件の空状態の中」と「一覧の下」の
 * 2か所に別々のボタンを描くため、1戦目を足して0件→1件に変わった瞬間に空状態側のボタンが
 * 消え、モーダルごと破棄されていた。その結果、1戦目では環境リターン(取得を待ってから開く)が
 * 開く先を失って一度も出なかった。モーダルの持ち主を件数で出し分けない場所に置いて防ぐ。
 */
export function useCreateMatchModal({
  record,
  setMatches,
  autoOpenReady,
}: {
  record: RecordGetByIdResponseType | null;
  setMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>>;
  /*
   * 他の画面からの「開いて」の指示(下の効果)に応えてよいか。
   * 対戦一覧が読み込み中・取得失敗のとき、そもそも追加できない表示のときは false。
   */
  autoOpenReady: boolean;
}): { open: () => void; modal: ReactNode } {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const router = useRouter();

  // このモーダルから対戦を足したか。閉じたときに1回だけ取り直しを促すために持つ
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
    if (isOpen) return;
    if (!addedRef.current) return;

    addedRef.current = false;
    router.refresh();
  }, [isOpen, router]);

  /*
   * 他の画面から「この記録の対戦を足しに来た」と指示されていれば、着いた時点で開く。
   * いまのところホームの「記録中」カードだけが立てる(utils/createMatchIntent)。
   *
   * 指示は読んだ時点で消す。残すと、モーダルを閉じて再読み込みしたときや
   * 戻り遷移で戻ってきたときに、また開いてしまう。
   * record と対戦一覧が揃うまで待つのは、モーダルが記録の内容(レギュレーション・集計対象か)を
   * 使い、開いた後ろに一覧が見えている必要があるため。
   */
  useEffect(() => {
    if (!record || !autoOpenReady) return;
    if (readSessionStorage(OPEN_CREATE_MATCH_RECORD_ID) !== record.id) return;

    writeSessionStorage(OPEN_CREATE_MATCH_RECORD_ID, null);
    onOpen();
    // onOpen は useDisclosure が返す安定した関数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, autoOpenReady]);

  const modal = (
    <CreateMatchModal
      record={record}
      setMatches={(update) => {
        addedRef.current = true;
        setMatches(update);
        /*
         * 画面下のバーの勝敗は、足した時点で合わせる。
         *
         * サーバ側の取り直し(router.refresh)は閉じるまで待つが、こちらは待てない。
         * 「続けて対戦結果を追加する」でフォームを開いたままにしたり、環境リターンの
         * シートが重なったりすると、閉じる操作を経ずにページを離れることがあり、
         * そのときバーだけ古い勝敗のまま残ってしまう。
         * バーはモーダルの背後にある別物なので、ここで取り直しても入力は妨げない。
         */
        refreshRecordingNow();
      }}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={onClose}
    />
  );

  return { open: onOpen, modal };
}

type Props = {
  // 押したときにモーダルを開く(useCreateMatchModal の open)
  onPress: () => void;
  // 横幅いっぱい＋縦を高めにして表示するか(戦績カード内のパネル下部で使用)
  fullWidth?: boolean;
};

export default function CreateMatchModalButton({ onPress, fullWidth = false }: Props) {
  return (
    <Button
      size="sm"
      radius="full"
      // 塗りの青(primary)にして、ほかの主要ボタンと同じブランドのグラデーションを当てる(globals.css)
      color="primary"
      fullWidth={fullWidth}
      className={fullWidth ? "h-10" : ""}
      onPress={onPress}
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
  );
}
