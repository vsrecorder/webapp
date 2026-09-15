// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OPEN_CREATE_MATCH_RECORD_ID } from "@app/utils/createMatchIntent";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/*
 * 入力モーダルの中身は別物なので、開いているかどうかだけ分かる形に置き換える
 * (実体は相手デッキ候補の取得を抱えており、マウントすると往復が走る)。
 * 「足す」「閉じる」はこのボタン側の振る舞いを確かめるために外から起こせるようにする。
 */
vi.mock("@app/components/organisms/Match/Modal/CreateMatchModal", () => ({
  default: ({
    isOpen,
    setMatches,
    onClose,
  }: {
    isOpen: boolean;
    setMatches: (v: unknown) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        対戦結果の入力フォーム
        <button onClick={() => setMatches([{ id: "m1" }])}>ダミー追加</button>
        <button onClick={onClose}>ダミー閉じる</button>
      </div>
    ) : null,
}));

const CreateMatchModalButton = (
  await import("@app/components/organisms/Match/CreateMatchModalButton")
).default;

const RECORD_ID = "01M2J6M2XH8JVG6VZT4RF889TE";

const record = { id: RECORD_ID } as unknown as RecordGetByIdResponseType;

function renderButton(target: RecordGetByIdResponseType | null = record) {
  return render(<CreateMatchModalButton record={target} setMatches={vi.fn()} />);
}

describe("CreateMatchModalButton", () => {
  beforeEach(() => {
    sessionStorage.clear();
    refresh.mockClear();
  });

  afterEach(cleanup);

  it("指示が無ければ開かない", () => {
    renderButton();

    expect(screen.queryByText("対戦結果の入力フォーム")).toBeNull();
  });

  // ホームの「記録中」カードから来たとき。着いた時点で入力に入れる
  it("この記録を開くよう指示されていれば、着いた時点で開く", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, RECORD_ID);

    renderButton();

    expect(screen.getByText("対戦結果の入力フォーム")).toBeTruthy();
  });

  it("開いたら指示を消す（閉じて再読み込みしても開き直さない）", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, RECORD_ID);

    renderButton();

    expect(sessionStorage.getItem(OPEN_CREATE_MATCH_RECORD_ID)).toBeNull();
  });

  it("別の記録への指示では開かず、指示も残したままにする", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, "01OTHERRECORDIDXXXXXXXXXXXX");

    renderButton();

    expect(screen.queryByText("対戦結果の入力フォーム")).toBeNull();
    expect(sessionStorage.getItem(OPEN_CREATE_MATCH_RECORD_ID)).toBe(
      "01OTHERRECORDIDXXXXXXXXXXXX",
    );
  });

  /*
   * 追記した戦績は、戻った先(ホームの「記録中」カード・記録一覧)にも出る。
   * クライアントキャッシュが効くと増える前の数字が出るので、閉じたら取り直させる。
   */
  it("対戦を足して閉じたら、戻った先のデータを取り直させる", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, RECORD_ID);
    renderButton();

    fireEvent.click(screen.getByText("ダミー追加"));
    expect(refresh).not.toHaveBeenCalled(); // 開いている間は走らせない

    fireEvent.click(screen.getByText("ダミー閉じる"));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("何も足さずに閉じたら取り直さない", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, RECORD_ID);
    renderButton();

    fireEvent.click(screen.getByText("ダミー閉じる"));

    expect(refresh).not.toHaveBeenCalled();
  });

  it("記録がまだ取れていなければ開かない", () => {
    sessionStorage.setItem(OPEN_CREATE_MATCH_RECORD_ID, RECORD_ID);

    renderButton(null);

    expect(screen.queryByText("対戦結果の入力フォーム")).toBeNull();
    // 記録が届いてから開けるよう、指示は消さずに残す
    expect(sessionStorage.getItem(OPEN_CREATE_MATCH_RECORD_ID)).toBe(RECORD_ID);
  });
});
