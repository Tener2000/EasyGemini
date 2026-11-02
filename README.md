# Easy Gemini v4.3.7

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)

Chromeのサイドパネルで複数のAI APIと対話できる拡張機能です。テキストの編集、推敲、翻訳などの作業を効率化します。

## ✨ 主な機能

### 🤖 対応LLMモデル一覧（マルチAI対応）

Easy Gemini では、クラウドAPI・ローカルLLM・CLIサブスク枠（OAuth/Agent SDK）を含む多彩な最新モデルをサイドパネルから切り替えて利用できます。

| プロバイダー | モデル名 | 内部モデルID | 概要・特徴 | 認証方式 |
| :--- | :--- | :--- | :--- | :--- |
| **Google Gemini** | **Gemini 3.8 Flash**（既定） | `gemini-3.8-flash` | 高速・高精度の標準主力モデル | APIキー / Google認証 |
| | **Gemini 3.8 Pro** | `gemini-3.8-pro` | 複雑な推論・コード生成に適した最上位モデル | APIキー / Google認証 |
| | **Gemini 3.7 Flash** | `gemini-3.7-flash` | 安定版 Flash モデル | APIキー / Google認証 |
| | **Gemini 3.5 Flash Lite** | `gemini-3.5-flash-lite` | 極めて低遅延・軽量なコスト効率重視モデル | APIキー / Google認証 |
| **Anthropic Claude** | **Claude Opus 5.5** | `claude-opus-5-5` | 卓越した論理的推論力を誇る最上位フラッグシップ | Claude APIキー |
| | **Claude Sonnet 5.5** | `claude-sonnet-5-5` | 日常作業から開発までこなす主力バランスモデル | Claude APIキー |
| | **Claude Haiku 5.5** | `claude-haiku-5-5` | 超高速・軽量な第5世代モデル | Claude APIキー |
| | **Claude Fable 5.1** | `claude-fable-5-1` | 高度な長文推敲・エージェント向け推論モデル | Claude APIキー |
| | **Claude Sonnet 5.5 (Agent SDK・試験)** | `claude-sdk-sonnet-5-5` | API従量課金不要でWebサブスク枠を使う経路 | Claude Code CLI ログイン |
| | **Claude Opus 5.5 (Agent SDK・試験)** | `claude-sdk-opus-5-5` | API従量課金不要でWebサブスク枠を使う経路 | Claude Code CLI ログイン |
| **OpenAI GPT** | **GPT-6 Astra** | `gpt-6-astra` | 最高峰の推論・創造性能を持つ第6世代最上位 | OpenAI APIキー |
| | **GPT-6.1 Terra** | `gpt-6.1-terra` | 文章作成や画面の理解に対応するモデル | OpenAI APIキー |
| | **GPT-6 Sol** | `gpt-6-sol` | 高性能かつ万能な第6世代標準モデル | OpenAI APIキー |
| | **GPT-6 Luna** | `gpt-6-luna` | 応答速度と効率に優れた第6世代軽量モデル | OpenAI APIキー |
| | **GPT-6 Sol (Hermes WSL)** | `hermes-gpt-6-wsl` | WSL上のHermes経由でChatGPTサブスク枠を利用 | WSL Hermes (openai-codex) |
| | **GPT-6.1 Terra (Hermes WSL)** | `hermes-gpt-6.1-terra-wsl` | WSL上のHermes経由でGPT-6.1 Terraを利用 | WSL Hermes (openai-codex) |
| | **Codex App Server (Local)** | `codex-app-server` | ローカルのCodex App Serverと直結するエージェント | Native Messaging |
| **xAI Grok** | **Grok 4.7** | `grok-4.7` | xAIの最新フラッグシップモデル | Grok APIキー |
| | **Grok 4.3** | `grok-4.3` | 実績のある安定版主力モデル | Grok APIキー |
| | **Grok 4.3 latest** | `grok-4.3-latest` | 常に最新マイナーバージョンを自動追従 | Grok APIキー |
| | **Grok 420 (Reasoning)** | `grok-420-reasoning` | 思考プロセス（思考タグ）を可視化する推論特化 | Grok APIキー |
| | **Grok 420 (Fast)** | `grok-420-non-reasoning` | 高速応答に特化した非推論モデル | Grok APIキー |
| | **Hermes Grok OAuth (WSL)** | `hermes-grok-oauth-wsl` | WSL上のHermes経由でxAI OAuth枠を利用 | WSL Hermes (xai-oauth) |
| **ローカルLLM / Gemma** | **Gemma 4 E2B / E4B / 26B / 31B** | `local-gemma-4-*` | Google最新オープンウェイトモデル（思考モード対応） | ローカル (Ollama / LM Studio等) |
| | **Qwen3.8 27B (Local)** | `local-qwen3.8-27b` | Ollama等で動作する高性能ローカルモデル | ローカル (Ollama) |
| | **ローカルLLM (カスタム)** | `local-llm` | 独自のエンドポイントURLとモデル名を指定 | OpenAI互換ローカルサーバー |

### 🧠 思考モード (Thinking Mode)
- Gemma 4などの推論モデルにおいて、回答前の思考プロセスを可視化。
- 思考中であることを示すUIと、思考ログの可視化に対応。

### 📑 マルチタブ機能
- 複数のセッションを並行して管理
- タブごとに異なるAIモデル・プロンプトを設定可能
- 実行中のタブには⏳アイコンで状態を表示
... (余計な変更を避けるため中略、実際は全文を維持または適切に置換)

### 📑 マルチタブ機能
- 複数のセッションを並行して管理
- タブごとに異なるAIモデル・プロンプトを設定可能
- 実行中のタブには⏳アイコンで状態を表示

### 📝 プリセット管理
- よく使う指示（プロンプト）をプリセットとして保存
- JSON形式でのエクスポート/インポート
- 最大200個のプリセットを管理

### 📚 履歴機能
- AI応答の履歴を自動保存（最大100件）
- 過去のやり取りを再利用可能
- 応答のコピー、削除機能

### 🌐 ページ本文取得
- 閲覧中のWebページの本文を自動抽出
- 抽出したテキストをAIに直接送信可能

### 📊 API使用量ダッシュボード
- 各APIの入出力トークン数を追跡
- 推定コストを自動計算
- 使用量リセット機能


### プリセット管理（v4.1.0）
- プリセットをフォルダごとに分類して管理できます。
- プリセット管理画面で、名前・本文検索とフォルダ絞り込みができます。
- 既存フォルダはプルダウンから選択でき、新規フォルダはフォルダ名を入力して保存できます。
- プリセット一覧はドラッグ＆ドロップで表示順を入れ替えられます。
- サイドパネルのプリセット選択は、フォルダごとに折りたたみ表示できます。
## 🚀 インストール方法

### Chrome Web Storeから（準備中）
*現在準備中です*

### 手動インストール（開発者モード）
1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone https://github.com/Tener2000/EasyGemini.git
   ```
2. Chromeで `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. ダウンロードしたフォルダを選択

## ⚙️ 初期設定

1. 拡張機能アイコンをクリックしてサイドパネルを開く
2. 「設定」ボタンをクリック
3. 使用するAIサービスのAPIキーを入力:
   - **Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)でAPIキーを取得
   - **Claude**: [Anthropic Console](https://console.anthropic.com/)でAPIキーを取得
   - **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを取得
4. 「保存」をクリック

### Qwen3.8 27BをOllamaで利用する（オプション）

ローカルの`Qwen3.8-27B-Q4_K_M.gguf`をOllamaへ登録し、Easy Geminiから利用できます。

1. 次の内容で`Modelfile`を作成します。パスは実際のGGUF保存先へ置き換えてください。
   ```text
   FROM C:\path\to\Qwen3.8-27B-Q4_K_M.gguf
   ```
2. Ollamaへ`qwen3.8-27b-local`として登録します。
   ```powershell
   ollama create qwen3.8-27b-local -f Modelfile
   ```
3. `chrome://extensions`でEasy Geminiの拡張機能IDを確認し、PowerShellでそのOriginだけを許可します。
   ```powershell
   [Environment]::SetEnvironmentVariable(
     'OLLAMA_ORIGINS',
     'chrome-extension://<拡張機能ID>',
     'User'
   )
   ```
4. Ollamaアプリを再起動し、Chromeの拡張機能画面でEasy Geminiを再読み込みします。
5. サイドパネルのモデル選択で`Qwen3.8 27B (Local)`を選びます。

OllamaへGGUFをインポートすると、Ollamaのモデル保存領域へモデル実体が複製される場合があります。LM Studioなど別のアプリにも同じGGUFを保存している場合は、ディスク使用量を確認してください。

### Codex App Server の利用設定（オプション）
ローカルのファイルやコマンドを操作できる「Codex App Server」を利用するには、ChromeのNative Messagingを利用した初期設定が必要です。
1. 設定画面を開き、「Codex App Server (Native Messaging)」のセクションから**「設定バッチ(.bat)をダウンロード」**をクリック
2. ダウンロードされた `install_host.bat` を拡張機能フォルダ内の `host` フォルダ (`Easy Gemini/host`) に移動
3. 移動した `install_host.bat` をダブルクリックして実行（レジストリに登録されます）
4. 設定画面の「接続テスト」をクリックして「接続成功！」と出れば準備完了です。
※ あらかじめPCに Node.js がインストールされており、Codex CLI (`npm install -g @openai/codex`) が利用できる環境が必要です。

### Hermes GPT-5.5 (WSL) の利用設定（オプション）
`GPT-5.5 (Hermes WSL)` は、WSL 上の Hermes から `openai-codex` provider を使って実行します。OpenAI API キーを使う通常の `GPT-5.6` とは別経路です。Hermes の openai-codex provider では現時点で `gpt-5.6` が最終応答を返さないため、既定値は `gpt-5.5` のままにしています。

1. WSL に Hermes をセットアップする
2. WSL のターミナルで OpenAI Codex OAuth 認証を追加する
   ```bash
   hermes auth add openai-codex --type oauth
   ```
3. 認証状態を確認する
   ```bash
   hermes auth status openai-codex
   ```
4. `logged in` と表示されたら、Easy Gemini の設定画面で「Hermes GPT-5.5 (WSL)」の接続テストを実行する
5. サイドパネルのモデル選択で `GPT-5.5 (Hermes WSL)` を選ぶ

認証は通常、同じ WSL 環境では1回設定すれば継続利用できます。トークンの期限切れ、ログアウト、WSL環境の作り直し、別ユーザー・別WSLディストリビューションでは再認証が必要です。

別のマシンで利用する場合は、そのマシンごとに Chrome 拡張、Native Messaging Host、WSL、Hermes をセットアップし、WSL 側で `hermes auth add openai-codex --type oauth` を実行してください。認証情報をコピーするより、各マシンで再ログインする方法を推奨します。

## 📖 使い方

### 基本的な使い方
1. サイドパネルを開く（拡張機能アイコンをクリック）
2. 使用するAIモデルを選択
3. 「指示」欄にプロンプトを入力
4. 「素材」欄に処理対象のテキストを入力（または「メインタブの本文を取得」でページから抽出）
5. 「Generate」ボタンをクリック（または `Ctrl/Cmd + Enter`）

### プリセットの活用
1. 「プリセット管理」から新規プリセットを作成
2. 名前と内容を入力して保存
3. メイン画面でプリセットを選択し「挿入」をクリック

### Avatar System
1. 「アバター／Skill管理」を開き、Avatar PackとTask Skill Packを開発用フォルダまたは交換用JSONから読み込みます。
2. 必要なら組合せProfileも読み込みます。
3. サイドパネルで「アバター」と「Task Skill」をそれぞれ0～1個選択します。既存プリセットとの併用も可能です。
4. 「今回使用する参照資料」で、生成時に選ばれたファイルを確認できます。

自然な日本語の執筆・推敲には、管理画面の「natural-japanese を追加」を押し、確認後にサイドパネルの「Task Skill」で「natural-japanese（Easy Gemini版）」を選びます。[coji/natural-japanese](https://github.com/coji/natural-japanese) を基にしたMITライセンスの適応版です。ブラウザ内では元SkillのPython検査スクリプトを実行せず、目視レビューで文章を確認します。数値の自然度スコアは算出しません。

Avatarは「誰の声で書くか」、Task Skillは「何をどの工程で作るか」を担当します。どちらも「なし」なら従来と同じプロンプトを送ります。Web検索が必要なSkillを検索非対応Providerで使う場合は、公式資料などを素材欄へ入力してください。

### 複数タブでの作業
- 「＋ 新規タブ」で新しいセッションを追加
- 各タブは独立したモデル・プロンプト設定を保持
- タブのタイトルは自動設定または手動で変更可能

## 🔐 プライバシー

- APIキーはローカルストレージに保存され、外部に送信されません
- APIリクエストは各AIプロバイダーに直接送信されます
- 履歴データはすべてローカルに保存されます
- Avatar／Task Skillの本文と作例はIndexedDBへ保存され、選択した場合だけプロンプトへ合成されます
- クラウドモデルへ送信する前に、privateな作例を含む可能性を確認する画面が表示されます
- 再配布不可のAvatarは交換用JSONとして書き出せません

## 📁 ファイル構成

```
Easy Gemini/
├── manifest.json       # 拡張機能の設定ファイル
├── background.js       # Service Worker
├── sidepanel.html      # メインUI
├── sidepanel.js        # メインロジック
├── key.html            # 設定画面UI
├── key.js              # 設定画面ロジック
├── presets.html        # プリセット管理UI
├── presets.js          # プリセット管理ロジック
├── avatar-manager.*    # Avatar／Task Skill／Profile管理
├── avatar-pack.js      # パック検証・入出力
├── avatar-store.js     # IndexedDB保存
├── runtime-context.js  # 共通プロンプト合成
├── extract.js          # ページ本文抽出スクリプト
└── icons/              # アイコン画像
```

## 🛠️ 使用技術

- **Chrome Extension Manifest V3**
- **Chrome Side Panel API**
- **Chrome Storage API**
- **Vanilla JavaScript** (フレームワーク不使用)

## 📝 更新履歴

### v4.3.7
- Hermes WSLでHTMLやバッククォートを含む入力を正しく渡せるように修正しました。
- 拡張機能のバージョンを4.3.7に更新しました。

### v4.3.6
- GPT-6.1 TerraをOpenAI APIおよびHermes WSLのモデル選択に追加しました。
- 各画面のバージョン表示を4.3.6に統一しました。

### v4.3.5
- 各プロバイダーの最新モデルへ刷新（Gemini 3.8 Pro, Gemini 3.5 Flash Lite, Claude Haiku 5.5, Claude Fable 5.1, Grok 4.7, Grok 420等に対応）。
- 提供終了となった旧世代モデル（Claude Haiku 4.5、Claude Opus 5、Grok 4.1 Fast等）を選択肢から削除し、安全なエイリアス移行を設定。
- WSL連携のHermes GPTを最新の `GPT-6 Sol (Hermes WSL)`（`hermes-gpt-6-wsl`）へアップデート。
- Claude APIクレジット不足やHermes xAI認証切れなどのエラー時に、原因と対処法がすぐに分かる日本語エラーメッセージ表示を追加。
- READMEに対応LLMの詳細一覧表を追加。
- 拡張機能のバージョンを 4.3.5 に更新しました。

### v4.3.4
- Claude Sonnet 5.5にAPI経路とAgent SDK経路で対応し、Sonnet 5の選択肢を置き換えました。
- Codex App Serverのモデル一覧からGPTモデルを選べるようにしました。
- 拡張機能のバージョンを4.3.4に更新しました。

### v4.3.3
- Anthropic Claude の最新モデル「Claude Opus 5.5」に対応しました。
- 拡張機能のバージョンを 4.3.3 に更新しました。

### v4.3.2
- OpenAI APIの選択肢を刷新し、第6世代モデル（`GPT-6 Astra`, `GPT-6 Sol`, `GPT-6 Luna`）に対応しました。
- Geminiのデフォルトモデルを `Gemini 3.8 Flash` に変更し、Gemini 3.6 Flash以前の旧モデルを整理・削除しました（旧モデル指定は自動でGemini 3.8 Flashへ移行）。
- 存在しないモデルIDへのフォールバックやエイリアス解決ロジックを強化しました。
- 拡張機能のバージョンを 4.3.2 に更新しました。

### v4.3.1
- Avatar、Task Skill、組合せProfileを読み込み・管理・適用できるAvatar System MVPを追加しました。
- Avatar／Task Skillの参照資料を依頼内容に応じて選択し、既存のシステムプロンプトやプリセットと合成する機能を追加しました。
- 開発用フォルダーの読み込みが反応しない問題を修正しました。
- 管理画面で読み込んだAvatar／Task Skillが、通常画面へ戻った際に自動で一覧へ反映されるよう改善しました。

### v4.3.0
- `SKILL.md`（YAML Frontmatter付きMarkdown）の読み込み・解析に対応しました。
- プリセット / Skill 管理画面にて `.json` および `.md` / `SKILL.md` の一括読み込みおよび「SKILL.md書き出し」機能を追加しました。
- サイドパネルの指示入力エリアへの `SKILL.md` ファイルのドラッグ＆ドロップ適用に対応しました。
- Gemini APIモデルの現行ラインアップと最安モデルを更新しました。
- 拡張機能のバージョンを 4.3.0 に更新しました。

### v4.2.3
- Gemini APIモデルの現行ラインアップと最安モデルを更新しました。

### v4.2.2
- Ollama経由の`Qwen3.8 27B (Local)`をモデル選択へ追加しました。
- Qwen3.8 27Bでは内部思考を無効化し、最終回答を安定して取得するようにしました。
- 専用モデル選択時はローカルOllamaのOpenAI互換APIへ接続するようにしました。
- OllamaのHTTP 403エラー案内を、Easy Geminiの拡張Originだけを許可する安全な設定へ改善しました。
- READMEにGGUFのインポート、CORS設定、ディスク使用量に関する手順を追加しました。
- 拡張機能のバージョンを4.2.2に更新しました。

### v4.2.1
- Geminiモデルを最新のラインアップ（Gemini 3.6 Flash, Gemini 3.5 Pro, Gemini 3.5 Flash, Gemini 3.1 Flash-Lite, Gemini 2.5 Pro, Gemini 2.5 Flash）に更新しました。
- デフォルトのGeminiモデルを `gemini-3.6-flash` に変更しました。
- 旧プレビューモデルおよび旧型番からの自動マッピング（エイリアス）処理を追加しました。
- 拡張機能のバージョンを 4.2.1 に更新しました。

### v4.1.0
- Claude API の Opus を `claude-opus-5` に更新し、旧 Opus 4.x 選択値を Opus 5 へ読み替えるようにしました。
- プリセットをフォルダ分けして管理できるようにしました。
- プリセット管理画面に検索、フォルダ絞り込み、既存フォルダ選択、新規フォルダ入力を追加しました。
- プリセット管理画面でドラッグ＆ドロップによる表示順の入れ替えに対応しました。
- サイドパネルのプリセット選択を、フォルダごとに折りたためるリスト形式に変更しました。
- 拡張機能のバージョンを 4.1.0 に更新しました。

### v4.0.5
- Gemini のデフォルトを軽量な `gemini-3.1-flash-lite` に変更し、終了済みプレビューを安定版へ読み替えるように更新
- Claude API に Claude Fable 5 / Opus 4.8 / Sonnet 5 を追加し、旧Claudeモデルを現行モデルへ読み替えるように更新
- OpenAI API の選択肢を GPT-5.6 系に更新し、旧GPT-5系モデルを整理
- Hermes WSL 経由の GPT は実動確認済みの `gpt-5.5` を維持
- 拡張機能のバージョンを 4.0.5 に更新

### v4.0.4
- Hermes Grok OAuth (WSL) の既定モデルを `grok-4.3` に更新
- 設定画面、接続テスト、Native Messaging ホスト、README の Grok OAuth モデル例を `grok-4.3` に統一
- 拡張機能のバージョンを 4.0.4 に更新

### v4.0.3
- GPT-5.5 (Hermes WSL) の `openai-codex` 認証手順と別マシン利用手順を README に追加
- Hermes の Codex 認証未設定エラーを、設定手順がわかる短いメッセージで表示するように改善
- 拡張機能のバージョンを 4.0.3 に更新

### v4.0.2
- Gemini Flash 3.5 (`gemini-3.5-flash`) に対応し、デフォルトモデルを更新
- Hermes Grok OAuth (WSL) を追加
- Native Messaging 経由で `wsl.exe` から `hermes -z --provider xai-oauth --model grok-4.3` を実行する連携に対応
- 設定画面に Hermes の Provider / Model と接続テストを追加
- Grok APIキーを使わず、Hermes側の xai-oauth 認証でGrokを利用できるモードを追加
- GPT-5.5 を OpenAI API 経由と Hermes WSL (`openai-codex`) 経由の別モデルとして選択できるように追加

### v4.0.1
- Gemini API を公式ドキュメント準拠の `gemini-3-flash-preview` / Gemini 3.1 系に更新
- OpenAI API に GPT-5.5 / GPT-5.4 系を追加し、現行モデルは Responses API に対応
- Claude API に Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 を追加
- xAI Grok に Grok 4.3 / Grok 4.20 を追加し、現行モデルは Responses API に対応
- Grok 4.3 向けに使用量ダッシュボードの概算単価を更新

### v4.0.0
- Codex App Server (Local Agent) との直接通信機能を追加（Native Messaging連携）

### v3.9.3
- Gemma 4 (Local LLM) への対応を追加
- 思考モード (Thinking Mode) のサポート
- デフォルトモデルを Gemini 3.1 Flash に更新
- 設定画面にローカルLLMの接続テスト機能を追加

### v3.8.0
- Google アカウントによるログイン機能を追加（APIキー不要で利用可能に）
- 認証エラーのトラブルシューティングを改善
- `manifest.json` の権限に `identity` を追加

### v3.7.0
- 履歴機能の追加
- 履歴からの再利用、コピー、削除機能

### v3.6.0
- API使用量ダッシュボードの追加
- トークン使用量とコスト推定の表示

### v3.5.0
- OpenAI API（GPTシリーズ）への対応

### v3.4.0
- Claude API対応

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Issue、Pull Requestを歓迎します！

---

Made with ❤️ for productive AI interactions
