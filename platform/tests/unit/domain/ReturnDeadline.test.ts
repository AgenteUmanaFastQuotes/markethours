import { describe, it, expect } from 'vitest';
import { addBusinessDays, isWeekend } from '../../../src/domain/shared/index.js';

// Helper to create a date at a given weekday:
// 2024-01-01 is Monday
// 2024-01-04 is Thursday
// 2024-01-05 is Friday
// 2024-01-06 is Saturday
// 2024-01-07 is Sunday

const MONDAY = new Date('2024-01-01T12:00:00.000Z');
const THURSDAY = new Date('2024-01-04T12:00:00.000Z');
const FRIDAY = new Date('2024-01-05T12:00:00.000Z');
const SATURDAY = new Date('2024-01-06T12:00:00.000Z');
const SUNDAY = new Date('2024-01-07T12:00:00.000Z');

function getUTCDay(date: Date): number {
  return date.getUTCDay();
}

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(SATURDAY)).toBe(true);
  });

  it('returns true for Sunday', () => {
    expect(isWeekend(SUNDAY)).toBe(true);
  });

  it('returns false for Monday', () => {
    expect(isWeekend(MONDAY)).toBe(false);
  });

  it('returns false for Thursday', () => {
    expect(isWeekend(THURSDAY)).toBe(false);
  });

  it('returns false for Friday', () => {
    expect(isWeekend(FRIDAY)).toBe(false);
  });
});

describe('addBusinessDays', () => {
  it('addBusinessDays(monday, 2) = wednesday', () => {
    const result = addBusinessDays(MONDAY, 2);
    // Monday + 2 business days = Wednesday (day 3 of week, getDay() = 3)
    expect(result.getDay()).toBe(3); // Wednesday
  });

  it('addBusinessDays(thursday, 2) = monday (skips weekend)', () => {
    const result = addBusinessDays(THURSDAY, 2);
    // Thursday + 1 = Friday, skip Sat+Sun, +1 more = Monday
    expect(result.getDay()).toBe(1); // Monday
  });

  it('addBusinessDays(friday, 1) = monday', () => {
    const result = addBusinessDays(FRIDAY, 1);
    // Friday + skip Sat+Sun = Monday
    expect(result.getDay()).toBe(1); // Monday
  });

  it('addBusinessDays(friday, 2) = tuesday', () => {
    const result = addBusinessDays(FRIDAY, 2);
    // Friday + skip Sat+Sun = Monday, +1 = Tuesday
    expect(result.getDay()).toBe(2); // Tuesday
  });

  it('addBusinessDays(monday, 5) = next monday', () => {
    const result = addBusinessDays(MONDAY, 5);
    // Mon+1=Tue, +1=Wed, +1=Thu, +1=Fri, skip Sat+Sun, +1=Mon (next week)
    expect(result.getDay()).toBe(1); // Monday
  });

  it('addBusinessDays(monday, 0) = monday (no change)', () => {
    const result = addBusinessDays(MONDAY, 0);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(MONDAY.getDate());
  });

  it('does not mutate the input date', () => {
    const original = new Date(MONDAY.getTime());
    addBusinessDays(MONDAY, 3);
    expect(MONDAY.getTime()).toBe(original.getTime());
  });
});

describe('FastQuote return deadline - D+2 business days', () => {
  it('return deadline initialized as D+2 business days from creation (weekday)', () => {
    const createdAt = MONDAY;
    const returnDeadline = addBusinessDays(createdAt, 2);
    // Monday + 2 business days = Wednesday
    expect(returnDeadline.getDay()).toBe(3); // Wednesday
  });

  it('return deadline skips weekend: Friday + 2 = Tuesday', () => {
    const createdAt = FRIDAY;
    const returnDeadline = addBusinessDays(createdAt, 2);
    expect(returnDeadline.getDay()).toBe(2); // Tuesday
  });

  it('return deadline is always a business day (not Saturday)', () => {
    const result = addBusinessDays(FRIDAY, 2);
    expect(isWeekend(result)).toBe(false);
  });

  it('return deadline is always a business day (not Sunday)', () => {
    const result = addBusinessDays(THURSDAY, 2);
    expect(isWeekend(result)).toBe(false);
  });

  it('D+2 from Thursday = Monday (skips Sat+Sun)', () => {
    const returnDeadline = addBusinessDays(THURSDAY, 2);
    expect(returnDeadline.getDay()).toBe(1); // Monday
  });
});
