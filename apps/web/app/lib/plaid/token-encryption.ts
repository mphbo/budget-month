import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";

const getKey = () => {
  const encodedKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  const key = encodedKey ? Buffer.from(encodedKey, "base64") : null;

  if (!key || key.length !== 32) {
    throw new Error(
      "PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }

  return key;
};

export const encryptAccessToken = (accessToken: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(accessToken, "utf8"),
    cipher.final(),
  ]);

  return [
    version,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
};

export const decryptAccessToken = (encryptedToken: string) => {
  const [tokenVersion, iv, authTag, ciphertext] = encryptedToken.split(":");
  if (tokenVersion !== version || !iv || !authTag || !ciphertext) {
    throw new Error("A linked institution has an invalid access token.");
  }

  const decipher = createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
