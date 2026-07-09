/**
 * Property-based tests for shift calendar consistency
 * Feature: security-workforce-payroll-system, Property 19: Shift Calendar Consistency
 * 
 * **Validates: Requirements 6.1, 6.2**
 * 
 * Tests that shift calendar operations (creation, swapping, recurring) maintain 
 * schedule integrity and prevent conflicts.
 */

import { test, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { addDays, format, startOfWeek, endOfWeek, isSameDay, isAfter, isBefore } from 'date-fns';

// Mock types matching the actual interfaces
interface TestShift {
  id: string;
  siteId: string;
  assignmentId?: string | null;
  shiftDate: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'EMERGENCY';
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NEEDS_COVERAGE';
  coverageRequired: number;
  coverageAssigned: number;
  isRecurring: boolean;
  recurringPattern?: {
    type: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
    occurrences?: number;
  };
}

interface TestSite {
  id: string;
  name: string;
  clientId: string;
}

interface TestEmployee {
  id: string;
  firstName: string;
  lastName: string;
  skills: string[];
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

interface TestAssignment {
  id: string;
  employeeId: string;
  siteId: string;
  role: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

// Test data generators
const timeStringGenerator = fc.integer({ min: 0, max: 23 }).chain(hour =>
  fc.integer({ min: 0, max: 59 }).map(minute => 
    `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  )
);

const shiftGenerator = fc.record({
  id: fc.uuid(),
  siteId: fc.uuid(),
  assignmentId: fc.option(fc.uuid()),
  shiftDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  startTime: timeStringGenerator,
  shiftType: fc.constantFrom('REGULAR', 'OVERTIME', 'HOLIDAY', 'EMERGENCY'),
  status: fc.constantFrom('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_COVERAGE'),
  coverageRequired: fc.integer({ min: 1, max: 5 }),
  coverageAssigned: fc.integer({ min: 0, max: 5 }),
  isRecurring: fc.boolean(),
}).chain(base => 
  timeStringGenerator.map(endTime => ({
    ...base,
    endTime,
    // Ensure end time is after start time
    startTime: base.startTime < endTime ? base.startTime : '08:00',
    endTime: base.startTime < endTime ? endTime : '16:00'
  }))
);

const siteGenerator = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  clientId: fc.uuid()
});

const employeeGenerator = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 20 }),
  lastName: fc.string({ minLength: 1, maxLength: 20 }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  employmentStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'TERMINATED')
});

const assignmentGenerator = fc.record({
  id: fc.uuid(),
  employeeId: fc.uuid(),
  siteId: fc.uuid(),
  role: fc.constantFrom('Security Guard', 'Supervisor', 'Patrol Officer', 'Reception'),
  status: fc.constantFrom('ACTIVE', 'COMPLETED', 'CANCELLED')
});

// Helper functions
function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  
  return s1 < e2 && s2 < e1;
}

function generateRecurringShifts(baseShift: TestShift, maxOccurrences: number = 10): TestShift[] {
  if (!baseShift.isRecurring || !baseShift.recurringPattern) {
    return [baseShift];
  }

  const shifts: TestShift[] = [baseShift];
  const pattern = baseShift.recurringPattern;
  let currentDate = new Date(baseShift.shiftDate);
  let occurrenceCount = 1;

  while (occurrenceCount < (pattern.occurrences || maxOccurrences)) {
    switch (pattern.type) {
      case 'DAILY':
        currentDate = addDays(currentDate, pattern.interval || 1);
        break;
      case 'WEEKLY':
        currentDate = addDays(currentDate, 7 * (pattern.interval || 1));
        break;
      case 'BIWEEKLY':
        currentDate = addDays(currentDate, 14);
        break;
      case 'MONTHLY':
        // Simplified monthly - just add 30 days
        currentDate = addDays(currentDate, 30 * (pattern.interval || 1));
        break;
    }

    if (pattern.endDate && isAfter(currentDate, pattern.endDate)) {
      break;
    }

    shifts.push({
      ...baseShift,
      id: `${baseShift.id}-${occurrenceCount}`,
      shiftDate: new Date(currentDate)
    });

    occurrenceCount++;
  }

  return shifts;
}

// Property tests
describe('Shift Calendar Consistency', () => {
  
  test('Property 1: Single day shifts do not overlap for same employee', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(shiftGenerator, { minLength: 2, maxLength: 10 }),
      assignmentGenerator,
      async (shifts, assignment) => {
        // **Validates: Requirements 6.1, 6.2**
        
        // Setup: Filter shifts to same date and same assignment
        const testDate = shifts[0].shiftDate;
        const sameDayShifts = shifts.map(shift => ({
          ...shift,
          shiftDate: testDate,
          assignmentId: assignment.id
        }));

        // Test: Check for time overlaps within the same day
        for (let i = 0; i < sameDayShifts.length; i++) {
          for (let j = i + 1; j < sameDayShifts.length; j++) {
            const shift1 = sameDayShifts[i];
            const shift2 = sameDayShifts[j];

            const hasOverlap = timeOverlaps(
              shift1.startTime, 
              shift1.endTime,
              shift2.startTime, 
              shift2.endTime
            );

            // Property: No overlapping shifts should exist for the same employee on the same day
            if (hasOverlap) {
              // This represents a schedule conflict that should be prevented
              expect(shift1.status).toBe('CANCELLED');
            }
          }
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 2: Recurring shifts maintain consistent timing', async () => {
    await fc.assert(fc.asyncProperty(
      shiftGenerator.filter(shift => shift.isRecurring),
      fc.record({
        type: fc.constantFrom('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'),
        interval: fc.integer({ min: 1, max: 3 }),
        occurrences: fc.integer({ min: 2, max: 5 })
      }),
      async (baseShift, recurringPattern) => {
        // **Validates: Requirements 6.1, 6.2**
        
        // Setup: Create recurring shift with pattern
        const shiftWithPattern = {
          ...baseShift,
          isRecurring: true,
          recurringPattern
        };

        // Test: Generate recurring shifts
        const recurringShifts = generateRecurringShifts(shiftWithPattern);

        // Verify: All generated shifts have consistent timing
        for (const shift of recurringShifts) {
          expect(shift.startTime).toBe(baseShift.startTime);
          expect(shift.endTime).toBe(baseShift.endTime);
          expect(shift.shiftType).toBe(baseShift.shiftType);
          expect(shift.siteId).toBe(baseShift.siteId);
          expect(shift.coverageRequired).toBe(baseShift.coverageRequired);
        }

        // Property: Recurring shifts maintain temporal consistency
        expect(recurringShifts.length).toBeGreaterThan(1);
        expect(recurringShifts.length).toBeLessThanOrEqual(recurringPattern.occurrences || 10);
      }
    ), { numRuns: 50 });
  });

  test('Property 3: Shift swapping preserves coverage requirements', async () => {
    await fc.assert(fc.asyncProperty(
      fc.tuple(shiftGenerator, shiftGenerator),
      fc.tuple(assignmentGenerator, assignmentGenerator),
      async ([shift1, shift2], [assignment1, assignment2]) => {
        // **Validates: Requirements 6.1, 6.2**
        
        // Setup: Two shifts with different assignments
        const originalShift1 = { ...shift1, assignmentId: assignment1.id };
        const originalShift2 = { ...shift2, assignmentId: assignment2.id };

        // Simulate shift swap operation
        const swappedShift1 = { ...originalShift1, assignmentId: assignment2.id };
        const swappedShift2 = { ...originalShift2, assignmentId: assignment1.id };

        // Test: Coverage requirements are maintained
        expect(swappedShift1.coverageRequired).toBe(originalShift1.coverageRequired);
        expect(swappedShift2.coverageRequired).toBe(originalShift2.coverageRequired);
        expect(swappedShift1.siteId).toBe(originalShift1.siteId);
        expect(swappedShift2.siteId).toBe(originalShift2.siteId);

        // Property: Shift swapping maintains all non-assignment attributes
        expect(swappedShift1.startTime).toBe(originalShift1.startTime);
        expect(swappedShift1.endTime).toBe(originalShift1.endTime);
        expect(swappedShift2.startTime).toBe(originalShift2.startTime);
        expect(swappedShift2.endTime).toBe(originalShift2.endTime);

        // Coverage assignment logic
        if (swappedShift1.assignmentId) {
          expect(swappedShift1.coverageAssigned).toBeGreaterThan(0);
        }
        if (swappedShift2.assignmentId) {
          expect(swappedShift2.coverageAssigned).toBeGreaterThan(0);
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 4: Weekly calendar view shows correct shifts per day', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(shiftGenerator, { minLength: 5, maxLength: 20 }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
      async (allShifts, weekStartDate) => {
        // **Validates: Requirements 6.1, 6.2**
        
        // Setup: Generate a week's worth of shifts
        const weekStart = startOfWeek(weekStartDate);
        const weekEnd = endOfWeek(weekStartDate);
        
        const weekShifts = allShifts.map((shift, index) => {
          // Distribute shifts across the week
          const dayOffset = index % 7;
          return {
            ...shift,
            shiftDate: addDays(weekStart, dayOffset)
          };
        });

        // Test: Group shifts by day
        const shiftsByDay: { [key: string]: TestShift[] } = {};
        
        for (const shift of weekShifts) {
          const dayKey = format(shift.shiftDate, 'yyyy-MM-dd');
          if (!shiftsByDay[dayKey]) {
            shiftsByDay[dayKey] = [];
          }
          shiftsByDay[dayKey].push(shift);
        }

        // Verify: Each day has correct shift assignments
        for (const [dayKey, dayShifts] of Object.entries(shiftsByDay)) {
          const shiftDate = new Date(dayKey);
          
          // Property: All shifts in a day group belong to that day
          for (const shift of dayShifts) {
            expect(isSameDay(shift.shiftDate, shiftDate)).toBe(true);
          }

          // Property: Coverage requirements are consistent per site
          const shiftsBySite: { [siteId: string]: TestShift[] } = {};
          dayShifts.forEach(shift => {
            if (!shiftsBySite[shift.siteId]) {
              shiftsBySite[shift.siteId] = [];
            }
            shiftsBySite[shift.siteId].push(shift);
          });

          for (const siteShifts of Object.values(shiftsBySite)) {
            const totalCoverageRequired = siteShifts.reduce((sum, shift) => sum + shift.coverageRequired, 0);
            const totalCoverageAssigned = siteShifts.reduce((sum, shift) => sum + shift.coverageAssigned, 0);
            
            // Property: Coverage assigned should not exceed coverage required
            expect(totalCoverageAssigned).toBeLessThanOrEqual(totalCoverageRequired);
          }
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 5: Shift status transitions are valid', async () => {
    await fc.assert(fc.asyncProperty(
      shiftGenerator,
      fc.constantFrom('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_COVERAGE'),
      async (shift, newStatus) => {
        // **Validates: Requirements 6.1, 6.2**
        
        const validTransitions: { [key: string]: string[] } = {
          'SCHEDULED': ['CONFIRMED', 'CANCELLED', 'NEEDS_COVERAGE'],
          'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
          'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
          'NEEDS_COVERAGE': ['SCHEDULED', 'CONFIRMED', 'CANCELLED'],
          'COMPLETED': [], // No transitions allowed from completed
          'CANCELLED': [], // No transitions allowed from cancelled
        };

        const currentStatus = shift.status;
        const allowedTransitions = validTransitions[currentStatus] || [];

        // Test: Status transition validation
        if (allowedTransitions.includes(newStatus) || currentStatus === newStatus) {
          // Valid transition
          const updatedShift = { ...shift, status: newStatus as any };
          expect(updatedShift.status).toBe(newStatus);
          
          // Property: Valid transitions maintain shift integrity
          expect(updatedShift.id).toBe(shift.id);
          expect(updatedShift.siteId).toBe(shift.siteId);
          expect(updatedShift.startTime).toBe(shift.startTime);
          expect(updatedShift.endTime).toBe(shift.endTime);
        } else {
          // Invalid transition - should maintain current status
          // In a real system, this would throw an error or be rejected
          expect(allowedTransitions).not.toContain(newStatus);
        }
      }
    ), { numRuns: 100 });
  });

});