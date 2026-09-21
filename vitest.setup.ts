import { afterEach } from "vitest";

/*
 * 全テスト共通の後始末。
 *
 * React はコミット後、useEffect の処理を scheduler(Node では setImmediate)に積む。
 * そのコールバックは先頭で window.event を読むため、テストが同期的に終わって
 * ファイルの実行が先に完了し jsdom が破棄されると、後から走って
 * "ReferenceError: window is not defined" の未処理エラーになる。tsc の直後など
 * 負荷が高いときだけ setImmediate が環境の破棄に追い越されるので、たまにしか出ない
 * (CreateDeckModal.test.tsx で実際に起きた)。
 *
 * テストごとに1ティック待ち、積まれた作業を環境が生きているうちに流し切る。
 * node 環境のテストにも入るが、setImmediate は Node にあるので害はない。
 */
afterEach(() => new Promise<void>((resolve) => setImmediate(resolve)));
