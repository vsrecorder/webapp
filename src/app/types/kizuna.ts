// デッキごとのきずなLv.（GET /api/users/{id}/kizuna）。
// 算出はバックエンド（core-apiserver の internal/domain/entity/kizuna.go）が行う。
// 指標の表示名や説明文はここには無い。UIの文言は webapp 側（utils/kizuna.ts）が持つ。

export type KizunaMetricType = {
  key: string;
  weight: number;
  // 0〜1 に正規化した達成度
  value: number;
  // points の合計が level に一致する
  points: number;
  max_points: number;
};

export type KizunaDeckType = {
  deck_id: string;
  level: number;
  metrics: KizunaMetricType[];
};

export type KizunaType = {
  user_id: string;
  // 上限（255）。クライアントに直書きさせないためサーバが返す
  max_level: number;
  decks: KizunaDeckType[];
};
