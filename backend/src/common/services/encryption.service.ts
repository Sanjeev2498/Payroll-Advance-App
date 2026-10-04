import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltRounds = 12;

  // Generate a random encryption key
  generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  // Encrypt sensitive data
  encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, keyBuffer);
    cipher.setAAD(Buffer.from('additional-auth-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, keyBuffer);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('additional-auth-data'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash passwords securely
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate secure random tokens
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate HMAC for data integrity
  generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Verify HMAC
  verifyHMAC(data: string, secret: string, expectedHmac: string): boolean {
    const actualHmac = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(Buffer.from(expectedHmac, 'hex'), Buffer.from(actualHmac, 'hex'));
  }
}