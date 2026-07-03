# Polka Protocol

Polka Protocolについては、./spec/SPEC.mdを必ず参照してください。

# 実装ガイド

ディレクトリ

docs/ ...文書公開サーバー
relay/ ...UDPブロードキャストを用いたリレーサーバー
space/ ...Dynamic Partの実装。Opusコーデックでエンコードされた音声を受け取り、UDPブロードキャストするサーバー

tools/setup ...セットアップスクリプト(２つのkeypairを生成)
tools/builder ...docsサーバーにアップロードするデータセットのMerkle Rootをとり、秘密鍵をパスワードから復号して署名

client/ ...Polka Protocol統合Webクライアント

denoをバンドラとして使ったStaticなバニラHTML + TypeScript
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
>
CSSにはpicoCSSを使い、クラスレスを徹底する。

鍵の扱い

トランスポート層の暗号化については、NoiseのNXパターンを用いる
Noise用のkeypairと、Merkle用のkeypairは別のものを用いる
Merkle用のkeypairはageで暗号化する(セットアップスクリプトでパスワードを求める)

~/.polka/transport/alg(秘密鍵) alg.pub
~/.polka/content/alg.age alg.pub

検証

.well-known/polkaに、
content-pk.root-hash.timestamp.sigという形式で置き、クライアントはそれを検証

ここでクライアント側は、フィンガープリントやDiceBearアバターを導出し目視チェック

deno monorepoで管理します。

使用するパッケージ
# noise-handshake
# age-encryption
# @noble/curves
# @noble/hashes
# opusscript
# @dicebear/core

jsrにあるやつはjsrを、npmのやつはnpm:で使ってください
