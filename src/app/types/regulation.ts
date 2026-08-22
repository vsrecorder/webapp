/*
 * レギュレーション(使用可能なカードの範囲)。
 * マスタは core-apiserver の regulations テーブルが正で、GET /api/regulations で取得できる。
 *
 * 記録一覧のカードのように「マスタの取得を待たずに描きたい」場所があるため、
 * ID・表示名・チップ色はこのファイルにも持たせている。テーブルへ行を足したときは
 * REGULATION_DISPLAY も併せて更新する。
 */
export type RegulationType = {
  id: number;
  name: string;
};

// 記録作成時の既定値(スタンダード)。
export const DEFAULT_REGULATION_ID = 1;

export const REGULATION_ID_STANDARD = 1;
export const REGULATION_ID_EXTRA = 2;
export const REGULATION_ID_HALL_OF_FAME = 3;
// 上のいずれにも当てはまらない対戦(独自ルールの自主大会など)の受け皿
export const REGULATION_ID_OTHER = 4;

type RegulationDisplay = {
  name: string;
  // 記録一覧カードのチップ色。大半の記録が占めるスタンダードは主張を弱くし、
  // それ以外が目に留まるようにしている。
  // warning は「集計対象外」の表示に充てているので、ここでは使わない
  // (同じカードに並ぶため、同系色だと別の意味が混ざって見える)。
  chipColor: "default" | "primary" | "secondary" | "danger";
};

export const REGULATION_DISPLAY: Record<number, RegulationDisplay> = {
  [REGULATION_ID_STANDARD]: { name: "スタンダード", chipColor: "default" },
  [REGULATION_ID_EXTRA]: { name: "エクストラ", chipColor: "secondary" },
  [REGULATION_ID_HALL_OF_FAME]: { name: "殿堂", chipColor: "danger" },
  [REGULATION_ID_OTHER]: { name: "その他", chipColor: "primary" },
};

// マスタ取得前に選択肢を描くためのフォールバック。取得できたらAPIの結果で置き換える。
export const FALLBACK_REGULATIONS: RegulationType[] = [
  REGULATION_ID_STANDARD,
  REGULATION_ID_EXTRA,
  REGULATION_ID_HALL_OF_FAME,
  REGULATION_ID_OTHER,
].map((id) => ({ id, name: REGULATION_DISPLAY[id].name }));

/*
 * チップに出す表示情報を引く。
 *
 * 未設定(APIが古くて regulation_id を返さない場合や 0)は、DB側の DEFAULT と同じ
 * スタンダードとして扱う。マスタにだけ行が増えた場合は表示だけ汎用の名前に倒し、
 * カードが壊れないようにする。
 */
export function regulationDisplay(id: number | undefined): RegulationDisplay {
  if (!id) {
    return REGULATION_DISPLAY[DEFAULT_REGULATION_ID];
  }

  return REGULATION_DISPLAY[id] ?? { name: "レギュレーション", chipColor: "default" };
}
