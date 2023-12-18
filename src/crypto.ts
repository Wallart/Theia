
function sanitizePublicKey(key: string): string {
  return key
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace('\n', '');
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function buf2b64(buf: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[ i ]);
  }
  return window.btoa(binary);
}

export async function encrypt(publicKeyPem: string, data: string) {
  const decoder = new TextEncoder();
  const dataToEncrypt = decoder.encode(data);

  publicKeyPem = sanitizePublicKey(publicKeyPem);
  const publicKeyRaw = str2ab(window.atob(publicKeyPem));
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyRaw,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );

  const encrypted = await window.crypto.subtle.encrypt(
    'RSA-OAEP',
    publicKey,
    dataToEncrypt
  );

  return buf2b64(encrypted);
}
