// Simple test to validate data structure

const mockRecord = {
  id: 'test-id',
  employee_id: 'emp-id',
  clock_in: new Date('2024-01-01T09:00:00Z'),
  clock_out: new Date('2024-01-01T17:00:00Z'),
  status: 'PRESENT',
  shifts: {
    id: 'shift-id',
    start_time: new Date('2024-01-01T09:00:00Z'),
    end_time: new Date('2024-01-01T17:00:00Z'),
    shift_type: 'REGULAR',
    shift_date: new Date('2024-01-01'),
    assignments: {
      hourly_rate: { toString: () => '25.0' }
    }
  },
  employees: {
    id: 'emp-id',
    first_name: 'John',
    last_name: 'Doe',
    employee_number: 'EMP001'
  }
};

// Test the getEmployeeHourlyRate method logic
const records = [mockRecord];
const firstRecord = records.find(record => record.shifts.assignments?.hourly_rate);
console.log('First record found:', !!firstRecord);
const rate = firstRecord?.shifts.assignments?.hourly_rate;
console.log('Rate found:', !!rate, rate?.toString());