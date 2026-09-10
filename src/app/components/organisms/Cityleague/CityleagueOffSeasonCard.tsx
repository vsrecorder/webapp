import Image from "next/image";

import { Card, CardBody } from "@heroui/react";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { formatJSTDate } from "@app/utils/date";

/*
 * ホーム(ダッシュボード)の「本日のシティリーグ結果」を、開催期間外に出すときの中身。
 *
 * シティリーグは年に数回のシーズンにまとまって開催されるため、期間外は
 * 当日の会場を出す CityleagueEvents に見せるものが何も無い。以前はこの節ごと
 * 消していたが、それだとホームの構成が時期によって変わり「パネルが消えた」と
 * 見える。節は残したまま、次に始まるシーズンを案内する。
 *
 * 期間外は上流に問い合わせるものが無いので、ここは props だけで描く
 * (CityleagueEvents は3リーグ区分ぶんの取得を抱えており、期間外はその往復が丸ごと無駄になる)。
 */

type Props = {
  // 次に始まるシーズン。未発表なら null
  next: CityleagueScheduleType | null;
};

/*
 * 開催期間中(CityleagueEvents の会場一覧カード)と同じ高さ。
 *
 * この節は開催期間で中身が入れ替わるが、パネルの大きさまで変わると
 * ホームの見た目が時期によって別物になる。会場一覧カードの高さは中の行数で決まり、
 * 390px 幅の実測で 232px(2026-05-06 / 05-03 / 03-15 の実データで一致)。
 * 中身が少ない期間外はここまで伸ばし、上下中央に置く。
 * 会場カードの構成を変えたときは、この値と CityleagueEventsSkeleton も測り直すこと。
 */
const MIN_HEIGHT_CLASS = "min-h-58";

export default function CityleagueOffSeasonCard({ next }: Props) {
  return (
    <Card className={`w-full shadow-md ${MIN_HEIGHT_CLASS}`}>
      <CardBody className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        {/* シティリーグのロゴ。結果カード(CityleagueResult)と同じ画像・同じ寸法に揃える。
            見出しと本文で「シティリーグ」と分かるので、装飾として alt は空にする */}
        <Image
          src="https://xx8nnpgt.user.webaccel.jp/images/icons/city.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
        />

        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-default-700">
            {next ? "次回のシティリーグ" : "本日の開催はありません"}
          </span>

          {next ? (
            <>
              <span className="text-xs text-default-600">{next.title}</span>
              <span className="text-xs text-default-500">
                {formatJSTDate(next.from_date)} 〜 {formatJSTDate(next.to_date)}
              </span>
            </>
          ) : (
            <span className="text-xs text-default-500">
              次回の開催予定が決まると、ここに表示します
            </span>
          )}
        </div>

        {/* このパネルが何を出す場所なのかの注意書き。開催期間外は中身が空に見えるため、
            「機能が壊れている」と受け取られないよう明記する */}
        <p className="text-tiny text-default-400">開催期間中は大会結果が表示されます</p>
      </CardBody>
    </Card>
  );
}
