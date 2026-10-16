import Image from "next/image";
import Link from "next/link";

// ヘッダー(モバイル・未ログイン)とデスクトップのサイドバーで共用するロゴ。
// withName はサービス名を横に添える(サイドバー用)。
export default function Logo({
  iconUrl,
  withName = false,
  className = "",
}: {
  iconUrl: string;
  withName?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 lg:w-10 lg:h-10 relative shrink-0">
        <Image
          src={iconUrl}
          alt="バトレコ"
          fill
          // 固定ヘッダー内なので常にファーストビューに入る。利用規約のような
          // テキスト主体のページではこのロゴが唯一の画像＝LCP要素になるため、
          // 遅延読み込みさせず優先的に取りに行かせる。
          preload
          // sizes はビューポート幅に依存させない。lg(1024px)を境に候補が変わると、
          // <head>のpreloadを評価した時点と<img>のレイアウト時点で幅が違った場合
          // (DevToolsの開閉やウィンドウのリサイズ)に別の候補が選ばれ、
          // 先読みした画像が捨てられる(preloaded but not used)。
          // 40px固定なら候補はDPRだけで決まるので必ず一致する。
          // ヘッダーとサイドバーで同じ値にしておけば、先読みも1本で済む。
          sizes="40px"
          className="object-contain rounded-lg"
        />
      </div>
      {withName && (
        // 文字はナビの選択中の項目と同じブランドのグラデーションで塗る(直下の span を抜く。globals.css)
        <span aria-hidden className="brand-gradient-content text-xl font-black tracking-wide">
          <span>バトレコ</span>
        </span>
      )}
    </Link>
  );
}
