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

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、各値を編集します。

```sh
cp .env.example .env
```

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
| `deno task browser` | ブラウザクライアントを起動する。`http://localhost:8184` で Pod のブラウズとコンテンツ検証が行えます。 |
| `deno task voice-client` | 音声クライアントを起動する。Space Server に接続して音声を送受信します。 |
| `deno task builder` | ドキュメントをビルドする。Markdown を Gemtext に変換し、Merkle Tree を構築してコンテンツ鍵で署名します。`.well-known/polka/token` と `.well-known/polka/manifest` を出力します。 |
| `deno task setup` | 鍵ペアを生成する。初回のみ実行します。 |

---

## 環境変数

| 変数名 | デフォルト値 | 説明 |
|---|---|---|
| `DOCS_ROOT` | `~/.polka/pod/` | Pod が配信するドキュメントのルートディレクトリ |
| `DOCS_PORT` | `8180` | Pod (Document Server) のポート番号 |
| `RELAY_PORT` | `8181` | Relay Server のポート番号 |
| `SPACE_PORT` | `8182` | Voice Space Server のポート番号 |
| `CLIENT_PORT` | `8183` | ブラウザクライアントのポート番号 |

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

## spec/

```
spec/
  concept.md        - 背景・動機・設計思想
  step/
    STEP-01.md      - コア仕様: Static Part / Dynamic Part / 公開範囲
```
