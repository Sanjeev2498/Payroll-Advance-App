import { Decimal } from 'decimal.js';

export interface GstRates {
  cgst: number; // Central GST
  sgst: number; // State GST  
  igst: number; // Integrated GST (for inter-state)
  utgst: number; // Union Territory GST
}

export interface GstCalculationInput {
  taxableAmount: Decimal;
  companyGstin: string;
  clientGstin?: string;
  placeOfSupply: string; // State/UT code
  companyState: string; // Company's state code
  isInterState?: boolean;
  serviceType: 'SECURITY_SERVICES' | 'MANPOWER_SERVICES' | 'FACILITY_MANAGEMENT';
}

export interface GstCalculationResult {
  taxableAmount: Decimal;
  gstRate: number;
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  utgst: Decimal;
  totalGst: Decimal;
  totalAmount: Decimal;
  isInterState: boolean;
  hsnCode: string;
}

export interface GstComplianceInfo {
  companyGstin: string;
  clientGstin?: string;
  placeOfSupply: string;
  placeOfSupplyName: string;
  companyState: string;
  companyStateName: string;
  isCompositeScheme: boolean;
  isReverseCharge: boolean;
}

// Indian state codes for GST
export const INDIAN_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh', 
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
} as const;

// HSN codes for security and manpower services  
export const SERVICE_HSN_CODES = {
  SECURITY_SERVICES: '9963', // Investigation and security services
  MANPOWER_SERVICES: '9987', // Manpower recruitment or supply services
  FACILITY_MANAGEMENT: '9995', // Facility management services
} as const;
