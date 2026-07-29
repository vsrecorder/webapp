/*
 * ポケモンカードゲーム プレイヤーズクラブの公開APIを叩くクライアント。
 *
 * 以前は core-apiserver 側で実在確認を行っていたが、外部サイトとの連携という責務を
 * BFF(このwebapp)に寄せ、core-apiserver は player_id と user_id の紐付け保存に
 * 専念する構成にしている。
 *
 * サーバー専用。ブラウザから直接叩くことはできない(CORSヘッダが返らないため応答を
 * 読めず、またクライアントの自己申告を信用すると所有権確認が成立しない)。
 */

// プレイヤーズクラブの実在確認API。テストから差し替えられるよう環境変数で上書きできる。
const PLAYER_ACCOUNT_API_URL =
  process.env.PLAYERS_CLUB_ACCOUNT_API_URL ??
  "https://players.pokemon-card.com/get_player_account_other";

// 接続からボディ読み切りまでの上限。外部サイトの遅延がBFFを詰まらせないようにする。
const REQUEST_TIMEOUT_MS = 10_000;

// 原因調査のためログへ載せる応答ボディの最大文字数。
const BODY_SNIPPET_MAX_LENGTH = 200;

export type PlayerAccount = {
  playerId: string;
  nickname: string;
  avatarImage: string;
  currentLeague: string;
  prefecture: string;
};

// player_id が存在しない、またはマイページが非公開。利用者側で解消できる。
export class PlayerNotFoundError extends Error {
  constructor() {
    super("player not found");
    this.name = "PlayerNotFoundError";
  }
}

// プレイヤーズクラブが応答しない、またはこのAPIの応答ではないものを返した。
// 利用者側では解消できないため、呼び出し元は 503 として扱う。
export class PlayersClubUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayersClubUnavailableError";
  }
}

type PlayerAccountOtherResponse = {
  // code は実在確認の結果(200/404)であると同時に、「このAPIが応答した」ことの目印も
  // 兼ねる。WAFのブロックページやプロキシのエラー応答と区別するために有無を見る。
  code?: number;
  player?: {
    player_id?: string;
    nickname?: string;
    avatar_image?: string;
    current_league?: string;
    prefecture?: string;
  } | null;
};

function bodySnippet(text: string): string {
  return text.slice(0, BODY_SNIPPET_MAX_LENGTH).trim();
}

/*
 * fetchPlayerAccount はプレイヤーズクラブへ player_id の実在確認を行う。
 *
 * このAPIは player_id が存在しない/マイページが非公開の場合、200以外のステータス
 * (404など)とともに {"code":404,"message":"..."} 形式のJSONを返す。そのため
 * ステータスコードだけでエラー扱いにはせず、ボディの code / player で判定する。
 *
 * 一方、ボディがそもそもこのAPIの応答でない場合(WAFのブロックページ、メンテナンス
 * 画面のHTML、プロキシのエラー応答など)は、プレイヤーが実在するかどうかを判定
 * できない。これを「存在しない」と扱うと利用者に誤った案内をしてしまうため、
 * PlayersClubUnavailableError として明確に区別する。
 */
export async function fetchPlayerAccount(playerId: string): Promise<PlayerAccount> {
  let res: Response;
  let text: string;

  try {
    res = await fetch(PLAYER_ACCOUNT_API_URL, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ player_id: playerId }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    text = await res.text();
  } catch (error) {
    throw new PlayersClubUnavailableError(
      `failed to reach players club api: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let body: PlayerAccountOtherResponse;
  try {
    body = JSON.parse(text) as PlayerAccountOtherResponse;
  } catch {
    throw new PlayersClubUnavailableError(
      `players club api returned a non-JSON response (status: ${res.status}, ` +
        `content_type: ${res.headers.get("content-type") ?? ""}, body: ${bodySnippet(text)})`,
    );
  }

  if (body == null || typeof body.code !== "number") {
    throw new PlayersClubUnavailableError(
      `players club api returned an unexpected response (status: ${res.status}, ` +
        `body: ${bodySnippet(text)})`,
    );
  }

  if (body.code !== 200 || body.player == null) {
    throw new PlayerNotFoundError();
  }

  return {
    playerId: body.player.player_id ?? "",
    nickname: body.player.nickname ?? "",
    avatarImage: body.player.avatar_image ?? "",
    currentLeague: body.player.current_league ?? "",
    prefecture: body.player.prefecture ?? "",
  };
}
