import { Injectable, Logger } from '@nestjs/common';
import { EncryptionUtil } from '../utils/encryption.util';
import { DataAccessLevel, canRoleDecrypt, canRoleView } from '../decorators/role-access.decorator';
import { 
  RoleBasedResponse,
  EmployeeRoleResponse,
  AssignmentRoleResponse,
  PayrollRoleResponse
} from '../dto/encrypted-field.dto';

@Injectable()
export class DataTransformService {
  private readonly logger = new Logger(DataTransformService.name);

  constructor(private readonly encryptionUtil: EncryptionUtil) {}

  /**
   * Transform employee data based on user role
   */
  transformEmployeeForRole(employee: any, userRole: string, isOwnData: boolean = false): EmployeeRoleResponse {
    const response: EmployeeRoleResponse = {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      skills: employee.skills || [],
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate,
      canViewSensitive: canRoleView(userRole, DataAccessLevel.SENSITIVE),
      canViewRestricted: canRoleView(userRole, DataAccessLevel.RESTRICTED),
      canViewFinancial: canRoleView(userRole, DataAccessLevel.FINANCIAL),
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };

    // Handle email
    if (employee.email && employee.emailIv && employee.emailTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.SENSITIVE) || isOwnData) {
        try {
          response.email = this.encryptionUtil.decryptEmail(
            employee.email,
            employee.emailIv,
            employee.emailTag
          );
        } catch (error) {
          this.logger.error(`Failed to decrypt email for employee ${employee.id}:`, error);
          response.email = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.SENSITIVE)) {
        // Show masked email for roles that can view but not decrypt
        const maskedEmail = this.encryptionUtil.maskData('user@example.com', userRole, 'email');
        response.email = maskedEmail;
      }
    }

    // Handle phone
    if (employee.phone && employee.phoneIv && employee.phoneTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.SENSITIVE) || isOwnData) {
        try {
          response.phone = this.encryptionUtil.decryptPhone(
            employee.phone,
            employee.phoneIv,
            employee.phoneTag
          );
        } catch (error) {
          this.logger.error(`Failed to decrypt phone for employee ${employee.id}:`, error);
          response.phone = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.SENSITIVE)) {
        response.phone = this.encryptionUtil.maskData('+91 12345-67890', userRole, 'phone');
      }
    }

    // Handle Aadhaar (Admin only)
    if (employee.aadhaarNumber && employee.aadhaarIv && employee.aadhaarTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.RESTRICTED)) {
        try {
          response.aadhaarNumber = this.encryptionUtil.decryptAadhaar(
            employee.aadhaarNumber,
            employee.aadhaarIv,
            employee.aadhaarTag
          );
        } catch (error) {
          this.logger.error(`Failed to decrypt Aadhaar for employee ${employee.id}:`, error);
          response.aadhaarNumber = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.RESTRICTED)) {
        response.aadhaarNumber = this.encryptionUtil.maskData('', userRole, 'aadhaar');
      }
    }

    // Handle PAN (Admin only)
    if (employee.panNumber && employee.panIv && employee.panTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.RESTRICTED)) {
        try {
          response.panNumber = this.encryptionUtil.decryptPAN(
            employee.panNumber,
            employee.panIv,
            employee.panTag
          );
        } catch (error) {
          this.logger.error(`Failed to decrypt PAN for employee ${employee.id}:`, error);
          response.panNumber = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.RESTRICTED)) {
        response.panNumber = this.encryptionUtil.maskData('', userRole, 'pan');
      }
    }

    return response;
  }

  /**
   * Transform assignment data based on user role
   */
  transformAssignmentForRole(assignment: any, userRole: string): AssignmentRoleResponse {
    const response: AssignmentRoleResponse = {
      id: assignment.id,
      employeeId: assignment.employeeId,
      siteId: assignment.siteId,
      role: assignment.role,
      responsibilities: assignment.responsibilities,
      status: assignment.status,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };

    // Handle hourly rate (Financial level - Admin only)
    if (assignment.hourlyRate && assignment.hourlyRateIv && assignment.hourlyRateTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.FINANCIAL)) {
        try {
          const decryptedRate = this.encryptionUtil.decryptFinancial(
            assignment.hourlyRate,
            assignment.hourlyRateIv,
            assignment.hourlyRateTag
          );
          response.hourlyRate = `₹${decryptedRate}/hour`;
        } catch (error) {
          this.logger.error(`Failed to decrypt hourly rate for assignment ${assignment.id}:`, error);
          response.hourlyRate = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.FINANCIAL)) {
        response.hourlyRate = '●●●●●/hour'; // Masked for non-admin roles
      }
    }

    // Include employee basic info (always safe to show)
    if (assignment.employee) {
      response.employee = {
        id: assignment.employee.id,
        firstName: assignment.employee.firstName,
        lastName: assignment.employee.lastName,
        employeeNumber: assignment.employee.employeeNumber,
        skills: assignment.employee.skills || [],
      };
    }

    // Include site basic info (always safe to show)
    if (assignment.site) {
      response.site = {
        id: assignment.site.id,
        name: assignment.site.name,
        address: assignment.site.address,
      };
    }

    return response;
  }

  /**
   * Transform payroll data based on user role
   */
  transformPayrollForRole(payrollItem: any, userRole: string, isOwnData: boolean = false): PayrollRoleResponse {
    const response: PayrollRoleResponse = {
      id: payrollItem.id,
      payrollRunId: payrollItem.payrollRunId,
      employeeId: payrollItem.employeeId,
      itemType: payrollItem.itemType,
      description: payrollItem.description,
      calculationData: payrollItem.calculationData,
      createdAt: payrollItem.createdAt,
      updatedAt: payrollItem.updatedAt,
    };

    // Handle amount (Financial level - Admin only or own data)
    if (payrollItem.amount && payrollItem.amountIv && payrollItem.amountTag) {
      if (canRoleDecrypt(userRole, DataAccessLevel.FINANCIAL) || isOwnData) {
        try {
          const decryptedAmount = this.encryptionUtil.decryptFinancial(
            payrollItem.amount,
            payrollItem.amountIv,
            payrollItem.amountTag
          );
          response.amount = `₹${decryptedAmount}`;
        } catch (error) {
          this.logger.error(`Failed to decrypt amount for payroll item ${payrollItem.id}:`, error);
          response.amount = 'DECRYPTION_ERROR';
        }
      } else if (canRoleView(userRole, DataAccessLevel.FINANCIAL)) {
        response.amount = '₹●●●●●'; // Masked for non-admin roles
      }
    }

    // Include employee basic info
    if (payrollItem.employee) {
      response.employee = {
        id: payrollItem.employee.id,
        firstName: payrollItem.employee.firstName,
        lastName: payrollItem.employee.lastName,
        employeeNumber: payrollItem.employee.employeeNumber,
      };
    }

    return response;
  }

  /**
   * Encrypt employee data before storing
   */
  encryptEmployeeData(employeeData: any): any {
    const encrypted = { ...employeeData };

    try {
      // Encrypt email
      if (employeeData.email) {
        const emailEncryption = this.encryptionUtil.encryptEmail(employeeData.email);
        if (emailEncryption) {
          encrypted.email = emailEncryption.encryptedData;
          encrypted.emailIv = emailEncryption.iv;
          encrypted.emailTag = emailEncryption.tag;
        }
      }

      // Encrypt phone
      if (employeeData.phone) {
        const phoneEncryption = this.encryptionUtil.encryptPhone(employeeData.phone);
        if (phoneEncryption) {
          encrypted.phone = phoneEncryption.encryptedData;
          encrypted.phoneIv = phoneEncryption.iv;
          encrypted.phoneTag = phoneEncryption.tag;
        }
      }

      // Encrypt Aadhaar
      if (employeeData.aadhaarNumber) {
        const aadhaarEncryption = this.encryptionUtil.encryptAadhaar(employeeData.aadhaarNumber);
        if (aadhaarEncryption) {
          encrypted.aadhaarNumber = aadhaarEncryption.encryptedData;
          encrypted.aadhaarIv = aadhaarEncryption.iv;
          encrypted.aadhaarTag = aadhaarEncryption.tag;
        }
      }

      // Encrypt PAN
      if (employeeData.panNumber) {
        const panEncryption = this.encryptionUtil.encryptPAN(employeeData.panNumber);
        if (panEncryption) {
          encrypted.panNumber = panEncryption.encryptedData;
          encrypted.panIv = panEncryption.iv;
          encrypted.panTag = panEncryption.tag;
        }
      }

      // Encrypt salary fields
      if (employeeData.basicSalary) {
        const basicSalaryEncryption = this.encryptionUtil.encryptBasicSalary(employeeData.basicSalary);
        if (basicSalaryEncryption) {
          encrypted.basicSalary = basicSalaryEncryption.encryptedData;
          encrypted.basicSalaryIv = basicSalaryEncryption.iv;
          encrypted.basicSalaryTag = basicSalaryEncryption.tag;
        }
      }

      if (employeeData.hraAmount) {
        const hraEncryption = this.encryptionUtil.encryptHRA(employeeData.hraAmount);
        if (hraEncryption) {
          encrypted.hraAmount = hraEncryption.encryptedData;
          encrypted.hraAmountIv = hraEncryption.iv;
          encrypted.hraAmountTag = hraEncryption.tag;
        }
      }

      if (employeeData.otherAllowances) {
        const allowancesEncryption = this.encryptionUtil.encryptFinancial(employeeData.otherAllowances);
        encrypted.otherAllowances = allowancesEncryption.encryptedData;
        encrypted.otherAllowancesIv = allowancesEncryption.iv;
        encrypted.otherAllowancesTag = allowancesEncryption.tag;
      }

      if (employeeData.grossSalary) {
        const grossSalaryEncryption = this.encryptionUtil.encryptFinancial(employeeData.grossSalary);
        encrypted.grossSalary = grossSalaryEncryption.encryptedData;
        encrypted.grossSalaryIv = grossSalaryEncryption.iv;
        encrypted.grossSalaryTag = grossSalaryEncryption.tag;
      }

      // Encrypt bank details
      if (employeeData.accountNumber) {
        const accountEncryption = this.encryptionUtil.encryptBankAccount(employeeData.accountNumber);
        if (accountEncryption) {
          encrypted.accountNumber = accountEncryption.encryptedData;
          encrypted.accountNumberIv = accountEncryption.iv;
          encrypted.accountNumberTag = accountEncryption.tag;
        }
      }

      if (employeeData.bankName) {
        const bankEncryption = this.encryptionUtil.encrypt(employeeData.bankName, 'financial');
        encrypted.bankName = bankEncryption.encryptedData;
        encrypted.bankNameIv = bankEncryption.iv;
        encrypted.bankNameTag = bankEncryption.tag;
      }

      if (employeeData.ifscCode) {
        const ifscEncryption = this.encryptionUtil.encryptIFSC(employeeData.ifscCode);
        if (ifscEncryption) {
          encrypted.ifscCode = ifscEncryption.encryptedData;
          encrypted.ifscCodeIv = ifscEncryption.iv;
          encrypted.ifscCodeTag = ifscEncryption.tag;
        }
      }

      // Encrypt statutory IDs
      if (employeeData.uanNumber) {
        const uanEncryption = this.encryptionUtil.encryptUAN(employeeData.uanNumber);
        if (uanEncryption) {
          encrypted.uanNumber = uanEncryption.encryptedData;
          encrypted.uanNumberIv = uanEncryption.iv;
          encrypted.uanNumberTag = uanEncryption.tag;
        }
      }

      if (employeeData.esicNumber) {
        const esicEncryption = this.encryptionUtil.encryptESIC(employeeData.esicNumber);
        if (esicEncryption) {
          encrypted.esicNumber = esicEncryption.encryptedData;
          encrypted.esicNumberIv = esicEncryption.iv;
          encrypted.esicNumberTag = esicEncryption.tag;
        }
      }

    } catch (error) {
      this.logger.error('Error encrypting employee data:', error);
      throw new Error('Failed to encrypt sensitive data');
    }

    return encrypted;
  }

  /**
   * Encrypt assignment data before storing
   */
  encryptAssignmentData(assignmentData: any): any {
    const encrypted = { ...assignmentData };

    try {
      // Encrypt hourly rate
      if (assignmentData.hourlyRate) {
        const rateEncryption = this.encryptionUtil.encryptFinancial(assignmentData.hourlyRate.toString());
        encrypted.hourlyRate = rateEncryption.encryptedData;
        encrypted.hourlyRateIv = rateEncryption.iv;
        encrypted.hourlyRateTag = rateEncryption.tag;
      }
    } catch (error) {
      this.logger.error('Error encrypting assignment data:', error);
      throw new Error('Failed to encrypt financial data');
    }

    return encrypted;
  }

  /**
   * Encrypt payroll data before storing
   */
  encryptPayrollData(payrollData: any): any {
    const encrypted = { ...payrollData };

    try {
      // Encrypt amount
      if (payrollData.amount) {
        const amountEncryption = this.encryptionUtil.encryptFinancial(payrollData.amount.toString());
        encrypted.amount = amountEncryption.encryptedData;
        encrypted.amountIv = amountEncryption.iv;
        encrypted.amountTag = amountEncryption.tag;
      }
    } catch (error) {
      this.logger.error('Error encrypting payroll data:', error);
      throw new Error('Failed to encrypt financial data');
    }

    return encrypted;
  }
}