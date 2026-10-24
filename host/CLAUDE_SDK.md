# Claude Agent SDK（試験経路）

Easy Geminiのモデル選択で「Agent SDK・試験」を選ぶと、既存のNative Messaging Hostから公式Claude Agent SDKを呼び出します。Hermes経路とClaude APIキー経路は使いません。SDKの組み込みツールは無効にしており、文章の生成だけを依頼します。

利用するWindowsユーザーでClaude Code CLIへサブスクアカウントとしてログインしてください。ClaudeのWebサイト、デスクトップアプリ、WSL側のHermesへのログインとは別です。Hostの依存パッケージは `host/package.json` と `host/package-lock.json` に記録されています。別の環境では `host` ディレクトリで `npm ci` を実行して復元します（公式SDKとその依存パッケージをダウンロードします）。

検証時はChromeで拡張機能を再読み込みし、短い入力で「Claude Sonnet 5.5 (Agent SDK・試験)」を1回実行します。回答が表示されること、Claudeの利用状況画面で想定する枠が消費されたことを確認してください。Hostは呼び出し前に公式CLIのサブスクログイン状態を確認し、認証用の環境変数やSDKのAPIキー認証を検出した場合は生成を止めます。SDKの初期化通知ではサブスク認証でも認証元が `none` と表示されることがあります。請求先は利用状況画面でも確認してください。

この経路は1回の生成ごとに新しいSDKセッションを作ります。タブ間でClaudeの会話履歴は共有せず、Easy Geminiの既存の履歴保存だけを利用します。
