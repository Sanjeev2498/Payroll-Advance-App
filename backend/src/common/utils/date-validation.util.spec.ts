import { BadRequestException } from '@nestjs/common';
import {
  validateDate,
  validateDateRange,
  parseAndValidateDate,
  parseAndValidateDateRange,
  DateValidationPatterns
} from './date-validation.util';

describe('DateValidationUtil - Bug 2 Fix', () => {
  describe('validateDate', () => {
    it('should accept valid dates', () => {
      const validDates = [
        '2024-01-01',
        '2024-02-29', // Leap year
        '2024-12-31',
        new Date('2024-06-15'),
        new Date()
      ];

      validDates.forEach(date => {
        const result = validateDate(date);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid dates that JS Date silently corrects', () => {
      const invalidDates = [
        { input: '2024-02-30', expected: 'silently corrected' }, // Feb 30 -> Mar 1
        { input: '2023-02-29', expected: 'silently corrected' }, // Non-leap year
        { input: '2024-13-01', expected: 'invalid' }, // Invalid month
        { input: '2024-01-32', expected: 'invalid' }, // Invalid day
      ];

      invalidDates.forEach(({ input }) => {
        const result = validateDate(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject year 0000 and negative years', () => {
      const invalidYears = ['0000-12-31', '-001-01-01'];

      invalidYears.forEach(date => {
        const result = validateDate(date);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid year format');
      });
    });

    it('should reject unreasonable future years', () => {
      const result = validateDate('9999-12-31');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be beyond 2100');
    });

    it('should allow null and undefined', () => {
      expect(validateDate(null).isValid).toBe(true);
      expect(validateDate(undefined).isValid).toBe(true);
    });

    it('should detect silently corrected dates', () => {
      const result = validateDate('2024-02-30');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('silently corrected');
      expect(result.correctedValue).toEqual(new Date('2024-03-01'));
    });
  });

  describe('validateDateRange', () => {
    it('should accept valid date ranges', () => {
      const result = validateDateRange('2024-01-01', '2024-12-31');
      expect(result.isValid).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = validateDateRange('2024-12-31', '2024-01-01');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Start date must be before');
    });

    it('should respect same date policy', () => {
      const allowSame = validateDateRange('2024-01-01', '2024-01-01', { allowSameDate: true });
      expect(allowSame.isValid).toBe(true);

      const disallowSame = validateDateRange('2024-01-01', '2024-01-01', { allowSameDate: false });
      expect(disallowSame.isValid).toBe(false);
    });

    it('should respect maximum range days', () => {
      const result = validateDateRange('2024-01-01', '2024-01-10', { maxRangeDays: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 5 days');
    });

    it('should respect minimum and maximum date bounds', () => {
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');

      const beforeMin = validateDateRange('2023-12-31', '2024-06-01', { minDate });
      expect(beforeMin.isValid).toBe(false);

      const afterMax = validateDateRange('2024-06-01', '2025-01-01', { maxDate });
      expect(afterMax.isValid).toBe(false);
    });
  });

  describe('parseAndValidateDate', () => {
    it('should return valid date', () => {
      const date = parseAndValidateDate('2024-01-01', 'test date');
      expect(date).toEqual(new Date('2024-01-01'));
    });

    it('should throw BadRequestException for invalid dates', () => {
      expect(() => {
        parseAndValidateDate('0000-12-31', 'hire date');
      }).toThrow(BadRequestException);

      expect(() => {
        parseAndValidateDate('2024-02-30', 'contract start');
      }).toThrow(BadRequestException);
    });

    it('should return null for null input', () => {
      expect(parseAndValidateDate(null)).toBeNull();
      expect(parseAndValidateDate(undefined)).toBeNull();
    });
  });

  describe('DateValidationPatterns', () => {
    describe('employmentDate', () => {
      it('should accept reasonable employment dates', () => {
        const validDates = ['2024-01-01', '2020-06-15', new Date()];
        
        validDates.forEach(date => {
          const result = DateValidationPatterns.employmentDate(date);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject dates before 1950', () => {
        const result = DateValidationPatterns.employmentDate('1949-12-31');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot be before 1950');
      });

      it('should reject dates more than 1 year in future', () => {
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 2);
        
        const result = DateValidationPatterns.employmentDate(farFuture);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('more than 1 year in the future');
      });
    });

    describe('contractDate', () => {
      it('should accept valid contract ranges', () => {
        const result = DateValidationPatterns.contractDate('2024-01-01', '2025-12-31');
        expect(result.isValid).toBe(true);
      });

      it('should reject same start and end dates', () => {
        const result = DateValidationPatterns.contractDate('2024-01-01', '2024-01-01');
        expect(result.isValid).toBe(false);
      });

      it('should reject contracts longer than 10 years', () => {
        const result = DateValidationPatterns.contractDate('2024-01-01', '2035-01-01');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed');
      });
    });

    describe('payrollPeriod', () => {
      it('should accept monthly payroll periods', () => {
        const result = DateValidationPatterns.payrollPeriod('2024-01-01', '2024-01-31');
        expect(result.isValid).toBe(true);
      });

      it('should reject periods longer than 31 days', () => {
        const result = DateValidationPatterns.payrollPeriod('2024-01-01', '2024-03-01');
        expect(result.isValid).toBe(false);
      });

      it('should reject periods before system launch', () => {
        const result = DateValidationPatterns.payrollPeriod('2023-12-01', '2023-12-31');
        expect(result.isValid).toBe(false);
      });
    });
  });
});