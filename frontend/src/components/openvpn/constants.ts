// VyOS OpenVPN enumerations sourced from VyOS CLI completion helpers.

export const LEGACY_CIPHERS: readonly string[] = [
  "3des",
  "aes128",
  "aes128gcm",
  "aes192",
  "aes192gcm",
  "aes256",
  "aes256gcm",
  "bf128",
  "bf256",
  "des",
  "none",
];

export const DATA_CIPHERS: readonly string[] = [
  "aes128",
  "aes128gcm",
  "aes192",
  "aes192gcm",
  "aes256",
  "aes256gcm",
  "chacha20-poly1305",
  "none",
];

export const HASH_ALGORITHMS: readonly string[] = [
  "md5",
  "sha1",
  "sha256",
  "sha384",
  "sha512",
];

export const TLS_VERSIONS: readonly string[] = ["1.0", "1.1", "1.2", "1.3"];
