# Polka Protocol

Static Part(文書ネットワーク)と Dynamic Part(音声空間)の2層で構成される、自己ホスト型の分散プロトコルです。

設計思想と仕様は [`spec/`](./spec/) を参照してください。

---

## セットアップ

### 1. ビルド

```sh
deno task build:cli
```

`dist/polka` バイナリが生成されます。

ブラウザクライアントをビルドする場合:

```sh
deno task build:browser
```

`dist/polka-browser` が生成されます。

### 2. 鍵ペアの生成

初回のみ実行します。X25519(トランスポート用)と Ed25519(コンテンツ署名用)の鍵ペアを `~/.polka/` 以下に生成します。

```sh
polka setup
```

コンテンツ鍵のパスフレーズを対話形式で入力します。

---

## コマンド一覧

`polka <subcommand> [options]` で実行します。

| サブコマンド | 説明 |
|---|---|
| `relay [--port <port>]` | Relay Server を起動する。Pod からの文書追加/更新イベントを UDP でブロードキャストします。デフォルトポート: 8181 |
| `space [--port <port>]` | Voice Space Server を起動する。参加者の Opus 音声パケットを UDP でブロードキャストします。デフォルトポート: 8182 |
| `pod [--port <port>] [--dir <dir>]` | Document Server を起動する。`--dir` のファイルを Noise NX で暗号化した TCP で配信します。デフォルトポート: 8180、デフォルトディレクトリ: `~/.polka/pod/` |
| `voice [--port <port>]` | 音声クライアントを起動する。ブラウザから `http://localhost:8183` でアクセスします。デフォルトポート: 8183 |
| `build [--dir <dir>]` | ドキュメントをビルドする。Markdown を Gemtext に変換し、Merkle Tree を構築してコンテンツ鍵で署名します。`.well-known/polka/token` と `.well-known/polka/manifest` を出力します。デフォルトディレクトリ: `~/.polka/pod/` |
| `setup` | 鍵ペアを生成する。初回のみ実行します。 |

---

## 鍵ファイルの場所

`polka setup` によって以下のパスに生成されます。

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
