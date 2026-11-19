/* =========================================================
   Classroom Browser — Shared Crypto Module
   AES-GCM + PBKDF2 (250k iterations, SHA-256).
   ========================================================= */
const CB_Crypto = (() => {
  const ITERATIONS = 250000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function unb64(s) {
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  async function deriveKey(pin, saltBytes) {
    const base = await crypto.subtle.importKey(
      'raw', enc.encode('pin:' + pin), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
      base, 256
    );
    return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  async function encryptConfig(pin, configObj) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pin, salt);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(configObj))
    );
    return {
      v: 1,
      kdf: { algo: 'PBKDF2-SHA256', iterations: ITERATIONS },
      salt: b64(salt),
      iv: b64(iv),
      data: b64(ct)
    };
  }

  async function decryptConfig(blob, pin) {
    const key = await deriveKey(pin, unb64(blob.salt));
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.data)
    );
    return JSON.parse(dec.decode(pt));
  }

  return { encryptConfig, decryptConfig };
})();
