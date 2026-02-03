# Easy Gemini v3.7

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)

Chromeのサイドパネルで複数のAI APIと対話できる拡張機能です。テキストの編集、推敲、翻訳などの作業を効率化します。

## ✨ 主な機能

### 🤖 マルチAI対応
- **Google Gemini** - Gemini 2.5 Pro/Flash, Gemini 3 Pro/Flash
- **Anthropic Claude** - Claude Sonnet 4, Claude Opus 4.5, Claude Haiku 4.5
- **OpenAI GPT** - GPT-5.2, GPT-5, GPT-4.1, GPT-4o, o3/o4シリーズ

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

### 複数タブでの作業
- 「＋ 新規タブ」で新しいセッションを追加
- 各タブは独立したモデル・プロンプト設定を保持
- タブのタイトルは自動設定または手動で変更可能

## 🔐 プライバシー

- APIキーはローカルストレージに保存され、外部に送信されません
- APIリクエストは各AIプロバイダーに直接送信されます
- 履歴データはすべてローカルに保存されます

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
├── extract.js          # ページ本文抽出スクリプト
└── icons/              # アイコン画像
```

## 🛠️ 使用技術

- **Chrome Extension Manifest V3**
- **Chrome Side Panel API**
- **Chrome Storage API**
- **Vanilla JavaScript** (フレームワーク不使用)

## 📝 更新履歴

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
