import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import {
  GstCalculationInput,
  GstCalculationResult,
  GstRates,
  GstComplianceInfo,
  INDIAN_STATE_CODES,
  SERVICE_HSN_CODES,
} from '../dto/gst-calculation.dto';

@Injectable()
export class GstCalculationService {
  
  /**
   * Calculate GST for security and manpower services
   */
  calculateGst(input: GstCalculationInput): GstCalculationResult {
    const {
      taxableAmount,
      companyGstin,
      clientGstin,
      placeOfSupply,
      companyState,
      serviceType,
    } = input;

    // Determine if this is an inter-state transaction
    const isInterState = this.isInterStateTransaction(companyState, placeOfSupply);

    // Get GST rates for the service type
    const gstRate = this.getServiceGstRate(serviceType);
    
    // Calculate GST components
    const gstRates = this.calculateGstComponents(gstRate, isInterState);
    
    // Apply rates to taxable amount
    const cgst = taxableAmount.mul(gstRates.cgst).div(100);
    const sgst = taxableAmount.mul(gstRates.sgst).div(100);
    const igst = taxableAmount.mul(gstRates.igst).div(100);
    const utgst = taxableAmount.mul(gstRates.utgst).div(100);

    const totalGst = cgst.add(sgst).add(igst).add(utgst);
    const totalAmount = taxableAmount.add(totalGst);

    return {
      taxableAmount,
      gstRate,
      cgst,
      sgst,
      igst,
      utgst,
      totalGst,
      totalAmount,
      isInterState,
      hsnCode: SERVICE_HSN_CODES[serviceType],
    };
  }

  /**
   * Get compliance information for GST
   */
  getGstComplianceInfo(input: Partial<GstCalculationInput>): GstComplianceInfo {
    const {
      companyGstin,
      clientGstin,
      placeOfSupply,
      companyState,
    } = input;

    const isInterState = this.isInterStateTransaction(companyState!, placeOfSupply!);
    
    return {
      companyGstin: companyGstin!,
      clientGstin,
      placeOfSupply: placeOfSupply!,
      placeOfSupplyName: INDIAN_STATE_CODES[placeOfSupply! as keyof typeof INDIAN_STATE_CODES] || 'Unknown',
      companyState: companyState!,
      companyStateName: INDIAN_STATE_CODES[companyState! as keyof typeof INDIAN_STATE_CODES] || 'Unknown',
      isCompositeScheme: this.isCompositeScheme(companyGstin!),
      isReverseCharge: this.isReverseChargeApplicable(companyGstin!, clientGstin),
    };
  }

  /**
   * Validate GSTIN format
   */
  validateGstin(gstin: string): { isValid: boolean; error?: string } {
    if (!gstin) {
      return { isValid: false, error: 'GSTIN is required' };
    }

    // GSTIN format: 15 characters - 2 state code + 10 PAN + 1 entity code + 1 Z + 1 check digit
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    
    if (!gstinRegex.test(gstin)) {
      return { isValid: false, error: 'Invalid GSTIN format' };
    }

    // Extract and validate state code
    const stateCode = gstin.substring(0, 2);
    if (!INDIAN_STATE_CODES[stateCode as keyof typeof INDIAN_STATE_CODES]) {
      return { isValid: false, error: 'Invalid state code in GSTIN' };
    }

    // Validate checksum (simplified version)
    if (!this.validateGstinChecksum(gstin)) {
      return { isValid: false, error: 'Invalid GSTIN checksum' };
    }

    return { isValid: true };
  }

  /**
   * Determine if transaction is inter-state
   */
  private isInterStateTransaction(companyState: string, placeOfSupply: string): boolean {
    return companyState !== placeOfSupply;
  }

  /**
   * Get GST rate for service type
   */
  private getServiceGstRate(serviceType: string): number {
    // As per Indian GST rates for security and manpower services
    switch (serviceType) {
      case 'SECURITY_SERVICES':
        return 18; // 18% GST on security services
      case 'MANPOWER_SERVICES':
        return 18; // 18% GST on manpower supply services  
      case 'FACILITY_MANAGEMENT':
        return 18; // 18% GST on facility management
      default:
        return 18; // Default 18% GST
    }
  }

  /**
   * Calculate GST component rates based on inter-state/intra-state
   */
  private calculateGstComponents(totalGstRate: number, isInterState: boolean): GstRates {
    if (isInterState) {
      // Inter-state: Only IGST applicable
      return {
        cgst: 0,
        sgst: 0,
        igst: totalGstRate,
        utgst: 0,
      };
    } else {
      // Intra-state: CGST + SGST (or UTGST for Union Territories)
      const halfRate = totalGstRate / 2;
      return {
        cgst: halfRate,
        sgst: halfRate,
        igst: 0,
        utgst: 0, // Would be used instead of SGST for UTs like Delhi, Chandigarh
      };
    }
  }

  /**
   * Check if company is under composition scheme
   */
  private isCompositeScheme(gstin: string): boolean {
    // Composition scheme entities have different entity codes
    // This is a simplified check - in real implementation, 
    // this would be determined from GST registration details
    const entityCode = gstin.charAt(12);
    return ['2', '3'].includes(entityCode); // Simplified check
  }

  /**
   * Check if reverse charge is applicable
   */
  private isReverseChargeApplicable(companyGstin?: string, clientGstin?: string): boolean {
    // Reverse charge is applicable in specific scenarios
    // For simplicity, assuming it's not applicable for most B2B transactions
    // In real implementation, this would check specific conditions
    return false;
  }

  /**
   * Validate GSTIN checksum (simplified)
   */
  private validateGstinChecksum(gstin: string): boolean {
    // Simplified checksum validation
    // Real implementation would use the actual GST checksum algorithm
    const checkDigit = gstin.charAt(14);
    
    // Basic validation - in real implementation, use proper checksum algorithm
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars.includes(checkDigit);
  }

  /**
   * Calculate GST for additional charges
   */
  calculateGstOnAdditionalCharges(
    charges: { name: string; amount: number; taxable: boolean }[],
    gstRate: number,
    isInterState: boolean
  ): {
    taxableCharges: Decimal;
    nonTaxableCharges: Decimal;
    gstOnCharges: Decimal;
    totalChargesWithGst: Decimal;
  } {
    const taxableCharges = charges
      .filter(charge => charge.taxable)
      .reduce((sum, charge) => sum.add(charge.amount), new Decimal(0));
    
    const nonTaxableCharges = charges
      .filter(charge => !charge.taxable)
      .reduce((sum, charge) => sum.add(charge.amount), new Decimal(0));

    const gstOnCharges = taxableCharges.mul(gstRate).div(100);
    const totalChargesWithGst = taxableCharges.add(nonTaxableCharges).add(gstOnCharges);

    return {
      taxableCharges,
      nonTaxableCharges,
      gstOnCharges,
      totalChargesWithGst,
    };
  }

  /**
   * Get state code from GSTIN
   */
  getStateCodeFromGstin(gstin: string): string {
    if (!gstin || gstin.length < 2) {
      throw new Error('Invalid GSTIN');
    }
    return gstin.substring(0, 2);
  }

  /**
   * Format GST amounts for display
   */
  formatGstBreakdown(gstResult: GstCalculationResult): {
    taxableAmount: string;
    cgst: string;
    sgst: string;
    igst: string;
    totalGst: string;
    totalAmount: string;
  } {
    return {
      taxableAmount: `₹${gstResult.taxableAmount.toFixed(2)}`,
      cgst: `₹${gstResult.cgst.toFixed(2)}`,
      sgst: `₹${gstResult.sgst.toFixed(2)}`,
      igst: `₹${gstResult.igst.toFixed(2)}`,
      totalGst: `₹${gstResult.totalGst.toFixed(2)}`,
      totalAmount: `₹${gstResult.totalAmount.toFixed(2)}`,
    };
  }
}
