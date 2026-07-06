import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'user_encryption_key';

// Get the key from local storage
export const getEncryptionKey = (): string | null => {
  return localStorage.getItem(STORAGE_KEY);
};

// Set the key (user inputs this)
export const setEncryptionKey = (key: string) => {
  if (!key) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, key);
  }
};

// Check if encryption is active
export const isEncryptionActive = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY);
};

// Encrypt a string or object
export const encryptData = (data: unknown): string => {
  const key = getEncryptionKey();
  if (!key) return typeof data === 'string' ? data : JSON.stringify(data); // Return as is if no key (fallback)
  
  try {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, key).toString();
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

// Decrypt a string
export const decryptData = (ciphertext: string): string => {
  const key = getEncryptionKey();
  if (!key) return ciphertext; // Cannot decrypt without key
  
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (e) {
    // Return empty or original if decryption fails (wrong key)
    return "";
  }
};

// Decrypt a JSON object
export const decryptObject = (ciphertext: string): unknown => {
  const text = decryptData(ciphertext);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};
