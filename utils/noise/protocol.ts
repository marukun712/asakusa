import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

const PROTOCOL_NAME = "Noise_NX_25519_ChaChaPoly_SHA256";

const concat = (a: Uint8Array, b: Uint8Array) => {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
};

const initHash = (): Uint8Array => {
	const name = new TextEncoder().encode(PROTOCOL_NAME);
	if (name.length <= 32) {
		const h = new Uint8Array(32);
		h.set(name);
		return h;
	}
	return sha256(name);
};

const mixHash = (h: Uint8Array, data: Uint8Array) => sha256(concat(h, data));

const mixKey = (k1: Uint8Array, k2: Uint8Array) => {
	const out = hkdf(sha256, k2, k1, new Uint8Array(), 64);
	return { ck: out.slice(0, 32), temp_k: out.slice(32, 64) };
};

const encodeNonce = (n: bigint) => {
	const nonce = new Uint8Array(12);
	new DataView(nonce.buffer).setBigUint64(4, n, true);
	return nonce;
};

// クライアント一時鍵を送信
export const client_first = () => {
	// クライアントが一時鍵をサーバーに送信
	const e_sk = x25519.utils.randomSecretKey();
	const e_pk = x25519.getPublicKey(e_sk);
	return { public: { e_pk }, private: { e_sk } };
};

// クライアント一時鍵を受け取り、サーバー静的鍵を暗号化して送信・鍵合意をする
export const server_first = (
	e_client_pk: Uint8Array,
	s: { pk: Uint8Array; sk: Uint8Array },
) => {
	let ck = initHash();
	let h = ck;
	h = mixHash(h, e_client_pk);

	// 前方秘匿性のためのサーバー一時鍵を生成
	const e_server_sk = x25519.utils.randomSecretKey();
	const e_server_pk = x25519.getPublicKey(e_server_sk);
	h = mixHash(h, e_server_pk);

	// クライアント一時鍵とサーバー一時鍵でDH
	const ee = x25519.getSharedSecret(e_server_sk, e_client_pk);
	const mk1 = mixKey(ck, ee);
	ck = mk1.ck;

	// DH結果でサーバー静的鍵を暗号化(認証のため)
	const s_pk_encrypted = chacha20poly1305(
		mk1.temp_k,
		encodeNonce(0n),
		h,
	).encrypt(s.pk);
	h = mixHash(h, s_pk_encrypted);

	// サーバー静的鍵とクライアント一時鍵でDH
	const es = x25519.getSharedSecret(s.sk, e_client_pk);
	const mk2 = mixKey(ck, es);
	ck = mk2.ck;

	// 累積鍵を暗号鍵・復号鍵に分割
	const split = mixKey(ck, new Uint8Array());
	return {
		public: { e: e_server_pk, s_pk_encrypted },
		private: { encrypt: split.temp_k, decrypt: split.ck },
	};
};

// サーバーの一時鍵と一時鍵で暗号化された静的鍵を受け取り、認証と鍵合意をする
export const client_second = (
	e_server_pk: Uint8Array,
	e_client_sk: Uint8Array,
	s_pk_encrypted: Uint8Array,
) => {
	// クライアント公開鍵を導出
	const e_client_pk = x25519.getPublicKey(e_client_sk);
	let ck = initHash();
	let h = ck;
	h = mixHash(h, e_client_pk);
	h = mixHash(h, e_server_pk);

	// クライアント一時鍵とサーバー一時鍵でDH
	const ee = x25519.getSharedSecret(e_client_sk, e_server_pk);
	const mk1 = mixKey(ck, ee);
	ck = mk1.ck;

	// サーバー静的鍵の復号
	const s_pk = chacha20poly1305(mk1.temp_k, encodeNonce(0n), h).decrypt(
		s_pk_encrypted,
	);
	h = mixHash(h, s_pk_encrypted);

	// サーバー静的鍵とクライアント一時鍵でDH
	const es = x25519.getSharedSecret(e_client_sk, s_pk);
	const mk2 = mixKey(ck, es);
	ck = mk2.ck;

	// 累積鍵を暗号鍵・復号鍵に分割
	const split = mixKey(ck, new Uint8Array());
	return {
		private: { encrypt: split.ck, decrypt: split.temp_k },
		serverPublicKey: s_pk,
	};
};

export const createTransport = (
	encryptKey: Uint8Array,
	decryptKey: Uint8Array,
) => {
	let encryptNonce = 0n;
	let decryptNonce = 0n;
	return {
		encrypt(data: Uint8Array): Uint8Array {
			return chacha20poly1305(
				encryptKey,
				encodeNonce(encryptNonce++),
				new Uint8Array(),
			).encrypt(data);
		},
		decrypt(data: Uint8Array): Uint8Array {
			return chacha20poly1305(
				decryptKey,
				encodeNonce(decryptNonce++),
				new Uint8Array(),
			).decrypt(data);
		},
	};
};
