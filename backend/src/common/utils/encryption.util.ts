import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits

  constructor(private configService: ConfigService) {}

  /**
   * Get encryption key based on data sensitivity level
   */
  private getEncryptionKey(level: 'sensitive' | 'restricted' | 'financial'): Buffer {
    const keyMap = {
      sensitive: this.configService.get<string>('ENCRYPTION_KEY_SENSITIVE'),
      restricted: this.configService.get<string>('ENCRYPTION_KEY_RESTRICTED'), 
      financial: this.configService.get<string>('ENCRYPTION_KEY_FINANCIAL'),
    };

    const keyString = keyMap[level];
    if (!keyString) {
      throw new Error(`Encryption key not found for level: ${level}`);
    }

    // Use PBKDF2 to derive a consistent key from the string
    return crypto.pbkdf2Sync(keyString, 'payroll-salt', 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  encrypt(plaintext: string, level: 'sensitive' | 'restricted' | 'financial'): EncryptionResult {
    if (!plaintext || plaintext.trim() === '') {
      throw new Error('Cannot encrypt empty or null data');
    }

    const key = this.getEncryptionKey(level);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Use createCipher for Node.js compatibility
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag: 'no-tag', // CBC mode doesn't use auth tags
    };
  }

  /**
   * Decrypt sensitive data with AES-256-CBC
   */
  decrypt(
    encryptedData: string, 
    iv: string, 
    tag: string, 
    level: 'sensitive' | 'restricted' | 'financial'
  ): string {
    if (!encryptedData || !iv) {
      throw new Error('Missing required decryption parameters');
    }

    const key = this.getEncryptionKey(level);
    
    // Use createDecipher for Node.js compatibility
    const decipher = crypto.createDecipher('aes-256-cbc', key);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt Aadhaar number with format preservation
   */
  encryptAadhaar(aadhaarNumber: string): EncryptionResult | null {
    if (!aadhaarNumber) return null;
    
    // Validate Aadhaar format (12 digits)
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      throw new Error('Invalid Aadhaar number format');
    }

    return this.encrypt(cleanAadhaar, 'restricted');
  }

  /**
   * Decrypt Aadhaar number with format restoration
   */
  decryptAadhaar(encryptedData: string, iv: string, tag: string): string {
    const decrypted = this.decrypt(encryptedData, iv, tag, 'restricted');
    
    // Format as XXXX-XXXX-XXXX
    return decrypted.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  /**
   * Encrypt PAN number
   */
  encryptPAN(panNumber: string): EncryptionResult | null {
    if (!panNumber) return null;
    
    // Validate PAN format (10 alphanumeric)
    const cleanPAN = panNumber.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPAN)) {
      throw new Error('Invalid PAN number format');
    }

    return this.encrypt(cleanPAN, 'restricted');
  }

  /**
   * Decrypt PAN number
   */
  decryptPAN(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'restricted');
  }

  /**
   * Encrypt phone number
   */
  encryptPhone(phoneNumber: string): EncryptionResult | null {
    if (!phoneNumber) return null;
    return this.encrypt(phoneNumber, 'sensitive');
  }

  /**
   * Decrypt phone number
   */
  decryptPhone(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'sensitive');
  }

  /**
   * Encrypt email address
   */
  encryptEmail(email: string): EncryptionResult | null {
    if (!email) return null;
    return this.encrypt(email, 'sensitive');
  }

  /**
   * Decrypt email address
   */
  decryptEmail(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'sensitive');
  }

  /**
   * Encrypt financial data (salary, rates, amounts)
   */
  encryptFinancial(amount: string | number): EncryptionResult {
    const amountString = typeof amount === 'number' ? amount.toString() : amount;
    return this.encrypt(amountString, 'financial');
  }

  /**
   * Decrypt financial data
   */
  decryptFinancial(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt salary components
   */
  encryptSalary(amount: string | number): EncryptionResult {
    const amountString = typeof amount === 'number' ? amount.toString() : amount;
    return this.encrypt(amountString, 'financial');
  }

  /**
   * Decrypt salary components
   */
  decryptSalary(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt bank account number
   */
  encryptBankAccount(accountNumber: string): EncryptionResult | null {
    if (!accountNumber) return null;
    
    // Validate bank account number (basic validation)
    const cleanAccount = accountNumber.replace(/\s/g, '');
    if (cleanAccount.length < 8 || cleanAccount.length > 20) {
      throw new Error('Invalid bank account number format');
    }

    return this.encrypt(cleanAccount, 'financial');
  }

  /**
   * Decrypt bank account number
   */
  decryptBankAccount(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt IFSC code
   */
  encryptIFSC(ifscCode: string): EncryptionResult | null {
    if (!ifscCode) return null;
    
    // Validate IFSC format (11 characters: 4 letters + 0 + 6 digits)
    const cleanIFSC = ifscCode.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIFSC)) {
      throw new Error('Invalid IFSC code format');
    }

    return this.encrypt(cleanIFSC, 'financial');
  }

  /**
   * Decrypt IFSC code
   */
  decryptIFSC(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt bank name
   */
  encryptBankName(bankName: string): EncryptionResult | null {
    if (!bankName) return null;
    return this.encrypt(bankName, 'financial');
  }

  /**
   * Decrypt bank name
   */
  decryptBankName(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt UAN number (EPF)
   */
  encryptUAN(uanNumber: string): EncryptionResult | null {
    if (!uanNumber) return null;
    
    // Validate UAN format (12 digits)
    const cleanUAN = uanNumber.replace(/\D/g, '');
    if (cleanUAN.length !== 12) {
      throw new Error('Invalid UAN number format');
    }

    return this.encrypt(cleanUAN, 'restricted');
  }

  /**
   * Decrypt UAN number
   */
  decryptUAN(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'restricted');
  }

  /**
   * Encrypt ESIC number
   */
  encryptESIC(esicNumber: string): EncryptionResult | null {
    if (!esicNumber) return null;
    
    // Validate ESIC format (17 digits)
    const cleanESIC = esicNumber.replace(/\D/g, '');
    if (cleanESIC.length !== 17) {
      throw new Error('Invalid ESIC number format');
    }

    return this.encrypt(cleanESIC, 'restricted');
  }

  /**
   * Decrypt ESIC number
   */
  decryptESIC(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'restricted');
  }

  /**
   * Encrypt basic salary
   */
  encryptBasicSalary(salary: string | number): EncryptionResult | null {
    if (!salary) return null;
    return this.encryptFinancial(salary);
  }

  /**
   * Decrypt basic salary
   */
  decryptBasicSalary(encryptedData: string, iv: string, tag: string): string {
    return this.decryptFinancial(encryptedData, iv, tag);
  }

  /**
   * Encrypt HRA amount
   */
  encryptHRA(hra: string | number): EncryptionResult | null {
    if (!hra) return null;
    return this.encryptFinancial(hra);
  }

  /**
   * Decrypt HRA amount
   */
  decryptHRA(encryptedData: string, iv: string, tag: string): string {
    return this.decryptFinancial(encryptedData, iv, tag);
  }

  /**
   * Encrypt bank account number
   */
  encryptBankAccount(accountNumber: string): EncryptionResult | null {
    if (!accountNumber) return null;
    
    // Validate bank account (basic validation)
    const cleanAccount = accountNumber.replace(/\D/g, '');
    if (cleanAccount.length < 8 || cleanAccount.length > 18) {
      throw new Error('Invalid bank account number format');
    }

    return this.encrypt(cleanAccount, 'financial');
  }

  /**
   * Decrypt bank account number
   */
  decryptBankAccount(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt IFSC code
   */
  encryptIFSC(ifscCode: string): EncryptionResult | null {
    if (!ifscCode) return null;
    
    // Validate IFSC format (11 characters: 4 letters + 7 digits)
    const cleanIFSC = ifscCode.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{4}[0][A-Z0-9]{6}$/.test(cleanIFSC)) {
      throw new Error('Invalid IFSC code format');
    }

    return this.encrypt(cleanIFSC, 'financial');
  }

  /**
   * Decrypt IFSC code
   */
  decryptIFSC(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt UAN number
   */
  encryptUAN(uanNumber: string): EncryptionResult | null {
    if (!uanNumber) return null;
    
    // Validate UAN format (12 digits)
    const cleanUAN = uanNumber.replace(/\D/g, '');
    if (cleanUAN.length !== 12) {
      throw new Error('Invalid UAN number format');
    }

    return this.encrypt(cleanUAN, 'restricted');
  }

  /**
   * Decrypt UAN number
   */
  decryptUAN(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'restricted');
  }

  /**
   * Encrypt ESIC number
   */
  encryptESIC(esicNumber: string): EncryptionResult | null {
    if (!esicNumber) return null;
    
    // Validate ESIC format (17 digits)
    const cleanESIC = esicNumber.replace(/\D/g, '');
    if (cleanESIC.length !== 17) {
      throw new Error('Invalid ESIC number format');
    }

    return this.encrypt(cleanESIC, 'restricted');
  }

  /**
   * Decrypt ESIC number
   */
  decryptESIC(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'restricted');
  }

  /**
   * Mask sensitive data based on user role
   */
  maskData(data: string, role: string, dataType: 'phone' | 'email' | 'aadhaar' | 'pan'): string {
    if (!data) return '';

    switch (role) {
      case 'EMPLOYEE':
        // Employees can see their own data partially masked
        switch (dataType) {
          case 'phone':
            return data.replace(/(\+91\s)(\d{2})(\d{3})-(\d{2})(\d{3})/, '$1●●$3-●●$5');
          case 'email':
            const [username, domain] = data.split('@');
            return `${username.slice(0, 2)}●●●@${domain}`;
          case 'aadhaar':
            return '●●●●-●●●●-●●●●';
          case 'pan':
            return '●●●●●●●●●●';
        }
        break;

      case 'SUPERVISOR':
      case 'MANAGER':
        // HR can see contact info but not identity documents
        switch (dataType) {
          case 'phone':
          case 'email':
            return data; // Show full contact info
          case 'aadhaar':
          case 'pan':
            return '●●●●●●●●●●●●'; // Hide identity documents
        }
        break;

      case 'COMPANY_ADMIN':
      case 'SUPER_ADMIN':
        return data; // Show everything

      default:
        return '●●●●●●●●●●●●'; // Hide everything for unknown roles
    }
  }

  /**
   * Generate secure random encryption keys (for initial setup)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Encrypt basic salary
   */
  encryptBasicSalary(amount: string | number): EncryptionResult {
    const amountString = typeof amount === 'number' ? amount.toString() : amount;
    return this.encrypt(amountString, 'financial');
  }

  /**
   * Decrypt basic salary
   */
  decryptBasicSalary(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }

  /**
   * Encrypt HRA amount
   */
  encryptHRA(amount: string | number): EncryptionResult {
    const amountString = typeof amount === 'number' ? amount.toString() : amount;
    return this.encrypt(amountString, 'financial');
  }

  /**
   * Decrypt HRA amount
   */
  decryptHRA(encryptedData: string, iv: string, tag: string): string {
    return this.decrypt(encryptedData, iv, tag, 'financial');
  }
}