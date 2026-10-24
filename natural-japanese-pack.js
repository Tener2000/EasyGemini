(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EasyGeminiNaturalJapanesePack = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const manifest = {
    format: 'easygemini-task-skill-pack',
    formatVersion: 1,
    id: 'skill.natural-japanese',
    name: 'natural-japanese（Easy Gemini版）',
    version: '1.0.0',
    language: 'ja-JP',
    description: 'coji/natural-japaneseを基にした、自然で読みやすい日本語の執筆・推敲用Task Skill。ブラウザ内で手動レビューを行う版。',
    author: { name: 'coji（原作） / Easy Gemini（適応版）' },
    rights: { visibility: 'public', license: 'MIT', redistribution: true, commercialUse: 'allowed' },
    entrypoints: { instructions: 'instructions/workflow.md', antiSlop: 'knowledge/manual-review.md' },
    knowledge: [],
    examples: [],
    evals: [],
    capabilities: [],
    contextPolicy: { strategy: 'selective', maxExamples: 0, maxReferenceCharacters: 1000 }
  };

  const files = [
    {
      path: 'license.txt',
      text: `MIT License

Copyright (c) 2026 coji

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
    },
    {
      path: 'instructions/workflow.md',
      text: `# natural-japanese — Easy Gemini向け

日本語の文書作成・推敲で、読み手に伝わる自然な文章を書く。議事録、報告書、ガイド、企画書、メール、記事、エッセイなどに適用する。元の文章がある場合は意味・事実・書き手の声を保つ。診断だけを求められた場合は書き換えない。

## 進め方

1. 読者、目的、文書の種類、主張を確認する。不足する固有名詞・数値・出典を創作しない。必要なら短く質問するか、確認が必要な箇所を示す。
2. 長文では、見出しと段落の役割を先に決める。見出しだけで論旨を追えるようにするが、既存文書の見出しを機械的にすべて書き換えない。
3. 重要な論点に紙幅を使い、軽い論点は短くする。因果や経緯は地の文でつなぎ、真に並列な項目だけ箇条書きにする。
4. 専門用語は、読者が知らない場合に機能を説明してから名前を出す。主張は具体例で支え、事実・推定・意見を区別する。根拠のない断定を足さない。
5. 書いた後は見出しと各段落の冒頭だけを通読し、論旨、繰り返し、濃淡、結びを確認する。さらに全文を読み、読みにくい文を文脈に合わせて直す。

## 文体の判断

- 前置きや結論の予告を重ねず、読者が知りたい内容から始める。
- 同じ書き出しや構文を3回続けない。すべての段落を同じ長さに整えない。
- 不必要な太字・三点構成・否定してから肯定する対比を避ける。
- 不確かなことは曖昧な語尾で均さず、推定や要確認と分かる形にする。
- 結びは本文の言い直しで埋めず、根拠が支える範囲で意味や次の行動につなぐ。不要なら結びを足さない。
- 語順、読点、一文一義、主語と述語の距離を確認する。短さだけを優先して情報を落とさない。

## Easy Geminiでの制約

この版は文章指示と目視レビューで動作する。元Skillのlint.py、outline.py、terms.py、semantic.pyやサブエージェントは実行しない。実行したと主張しない。自然度の数値スコアを求められても、機械検査なしの数値を元Skillのスコアとして提示せず、定性的な診断と根拠を返す。元Skillのquick/full指定はレビューの深さの目安として扱う。`
    },
    {
      path: 'knowledge/manual-review.md',
      text: `# 手動レビュー

文章を一律に置換せず、見つけた表現ごとに文脈を判断する。

- 「重要なのは」「このように」「と言えるでしょう」「〜することができる」「多角的に」「深掘りする」などの常套句が集中していないか。
- 「〜ではなく、〜」「〜だけでなく〜も」、空疎な接続詞、同じ文頭が続いていないか。
- 文・段落の長さがそろいすぎていないか。体言止めや抽象語に頼り、具体的な事実が抜けていないか。
- 英語の直訳のような無生物主語、重なる修飾節、二重否定、「の」の連鎖が読解を妨げていないか。
- 見出しと段落冒頭を並べたとき論旨が通るか。結びが主張と根拠の範囲を超えていないか。

違和感がある箇所だけ直し、元の自然な濃淡や個人の文体を残す。修正後に通読し、新たな違和感が生じていないか確認する。診断だけの依頼なら、代表箇所と理由、直す優先順位を述べ、本文は変更しない。`
    }
  ];

  function createPack(packApi) {
    return packApi.parsePortableBundle({
      bundleFormat: 'easygemini-portable-pack',
      bundleVersion: 1,
      manifest,
      files
    }, { source: 'bundled:coji/natural-japanese' });
  }

  return { createPack };
});
