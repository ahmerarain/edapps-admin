import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;

export type KeyPair = { seed: Uint8Array; publicKey: Uint8Array; publicHex: string };

export function loadKeys(): KeyPair {
  const seedHex = (process.env.ED25519_SEED || "").trim();
  if (!seedHex) {
    throw new Error("ED25519_SEED is not set. Copy the hex from sms-license/data/ed25519.sk into Vercel env.");
  }
  const seed = Uint8Array.from(Buffer.from(seedHex, "hex"));
  if (seed.length !== 32) throw new Error("ED25519_SEED must be 32 bytes hex");
  const { secretKey, publicKey } = ed.keygen(seed);
  return { seed: secretKey, publicKey, publicHex: Buffer.from(publicKey).toString("hex") };
}

export function signCanonical(seed: Uint8Array, message: string): string {
  const sig = ed.sign(new TextEncoder().encode(message), seed);
  return Buffer.from(sig).toString("hex");
}
