module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      //
      // プロセス単位のメモリ上限。docker-compose.yml の mem_limit(1536m)は
      // コンテナ全体に対するカーネルの制限で、超えると cgroup の OOM Killer が
      // プロセスを SIGKILL する。処理中のリクエストはその場で切断される。
      //
      // pm2 側にこの閾値を置くと、cgroup の制限に達する前に pm2 が
      // 再起動を行う。cluster モードでは1インスタンスずつ入れ替わるため、
      // 残りのインスタンスがリクエストを受け続けられる。
      //
      // 384M の根拠: 2026-08-16 の本番実測で next-server 1プロセスあたり RSS 176MB
      // (8日23時間の連続稼働後)。その約2倍を取っている。
      // 2プロセスで768M + pm2 daemon 約74M = 842M となり、
      // docker-compose.yml の mem_limit(1024m)の内側に収まる。
      //
      max_memory_restart: '384M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        HOSTNAME: '0.0.0.0',
        //
        // V8 のヒープ上限。Node はコンテナの cgroup 制限を見て自動設定するが、
        // cluster で複数プロセスが動く場合、各プロセスが「コンテナ全体の制限」を
        // 自分ひとりの取り分と誤認して合計が mem_limit を超えうるため明示する。
        //
        // max_memory_restart(384M)が見る RSS にはヒープ以外(コード・スタック・
        // バッファ)も含まれるため、ヒープ上限はそれより小さい 256MB に置く。
        // 実測 RSS 176MB に対して十分な余裕がある。
        // OGP画像生成が使う WASM のメモリは V8 ヒープの外側なのでこの値には影響しない。
        //
        NODE_OPTIONS: '--max-old-space-size=256',
      },
    },
  ],
};
