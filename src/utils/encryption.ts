import crypto from 'crypto';

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your_encryption_key_here';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Convert hex string to Buffer if it's a hex string
const getKeyBuffer = (): Buffer => {
  // Check if the key is a hex string (should be 64 characters for a 32-byte key)
  if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  
  // If it's not a valid hex string, hash it to get a consistent length key
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY);
  return hash.digest();
};

/**
 * Encrypt a string using AES-256-CBC
 * @param text Text to encrypt
 * @returns Encrypted text
 */
export const encrypt = (text: string): string => {
  // Create an initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher with properly formatted key
  const cipher = crypto.createCipheriv('aes-256-cbc', getKeyBuffer(), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv + encrypted data as a single string
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt a string using AES-256-CBC
 * @param encryptedText Text to decrypt
 * @returns Decrypted text
 */
export const decrypt = (encryptedText: string): string => {
  // Split iv and encrypted text
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
  const encryptedData = textParts.join(':');
  
  // Create decipher with properly formatted key
  const decipher = crypto.createDecipheriv('aes-256-cbc', getKeyBuffer(), iv);
  
  // Decrypt the text
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Encrypt an object by converting it to JSON string and encrypting
 * @param obj Object to encrypt
 * @returns Encrypted string
 */
export const encryptObject = (obj: any): string => {
  return encrypt(JSON.stringify(obj));
};

/**
 * Decrypt a string and parse it as JSON
 * @param encryptedText Encrypted text
 * @returns Decrypted object
 */
export const decryptObject = <T>(encryptedText: string): T => {
  const decrypted = decrypt(encryptedText);
  return JSON.parse(decrypted) as T;
};

export default {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject
};
