# Polka Protocol

Static Part(文書ネットワーク)と Dynamic Part(音声空間)の2層で構成される、自己ホスト型の分散プロトコルです。

設計思想と仕様は [`spec/`](./spec/) を参照してください。

---

## セットアップ

### 1. 鍵ペアの生成

初回のみ実行します。X25519(トランスポート用)と Ed25519(コンテンツ署名用)の鍵ペアを `~/.polka/` 以下に生成します。

```sh
deno task setup
```

コンテンツ鍵のパスフレーズを対話形式で入力します。

---

## コマンド一覧

### サーバー

| コマンド | 説明 |
|---|---|
| `deno task pod` | Document Server を起動する。`DOCS_ROOT` のファイルを Noise NX で暗号化した TCP で配信します。 |
| `deno task relay` | Relay Server を起動する。Pod からの文書追加/更新イベントを UDP でブロードキャストします。 |
| `deno task space` | Voice Space Server を起動する。参加者の Opus 音声パケットを UDP でブロードキャストします。 |

### クライアント / ツール

| コマンド | 説明 |
|---|---|
| `deno task browser` | ブラウザクライアントを起動する。`http://localhost:8183` で Pod のブラウズとコンテンツ検証が行えます。 |
| `deno task voice` | 音声クライアントを起動する。Space Server に接続して音声を送受信します。 |
| `deno task build` | ドキュメントをビルドする。Markdown を Gemtext に変換し、Merkle Tree を構築してコンテンツ鍵で署名します。`.well-known/polka/token` と `.well-known/polka/manifest` を出力します。 |
| `deno task setup` | 鍵ペアを生成する。初回のみ実行します。 |

### バイナリ (polka) のサブコマンド

ビルド済みバイナリを使う場合は `polka <subcommand> [args]` で実行します。

```
polka relay [port]            relay server を起動する
polka space [port]            space server を起動する
polka pod [port] [docs-root]  pod server を起動する
polka voice [port]            音声クライアントを起動する
polka browser [port]          ブラウザクライアントを起動する
polka setup                   鍵ペアを生成する
polka build [docs-dir]        ドキュメントをビルドして署名する
```

---

## 鍵ファイルの場所

`deno task setup` によって以下のパスに生成されます。

```
~/.polka/
  transport/
    key      - X25519 秘密鍵 (トランスポート暗号化用)
    key.pub  - X25519 公開鍵
  content/
    key      - Ed25519 秘密鍵 (コンテンツ署名用、パスフレーズで暗号化)
    key.pub  - Ed25519 公開鍵
```

---

## Nix

開発環境:

```sh
nix develop
```

---

## spec/

```
spec/
  concept.md        - 背景・動機・設計思想
  step/
    STEP-01.md      - コア仕様: Static Part / Dynamic Part / 公開範囲
```
