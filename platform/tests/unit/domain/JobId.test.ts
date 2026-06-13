import { describe, it, expect } from 'vitest';
import {
  isValidJobId,
  parseJobIdFromSubject,
  jobIdMustBeInSubject,
} from '../../../src/domain/jobs/JobStatus.js';

describe('JobId - isValidJobId', () => {
  it('accepts "UJ-5-1715000000000"', () => {
    expect(isValidJobId('UJ-5-1715000000000')).toBe(true);
  });

  it('accepts "UJ-123-9999999999999"', () => {
    expect(isValidJobId('UJ-123-9999999999999')).toBe(true);
  });

  it('rejects "UJ5-1715000000000" (missing first dash)', () => {
    expect(isValidJobId('UJ5-1715000000000')).toBe(false);
  });

  it('rejects "uj-5-123" (lowercase prefix)', () => {
    expect(isValidJobId('uj-5-123')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidJobId('')).toBe(false);
  });

  it('rejects "UJ-abc-123" (non-numeric segment)', () => {
    expect(isValidJobId('UJ-abc-123')).toBe(false);
  });

  it('rejects "UJ-5" (missing second segment)', () => {
    expect(isValidJobId('UJ-5')).toBe(false);
  });

  it('rejects "UJ--5-123" (double dash)', () => {
    expect(isValidJobId('UJ--5-123')).toBe(false);
  });

  it('rejects random string', () => {
    expect(isValidJobId('not-a-job-id')).toBe(false);
  });
});

describe('JobId - parseJobIdFromSubject', () => {
  it('finds JOB_ID in "Orçamento Evento Tech - UJ-5-1715000000000"', () => {
    const result = parseJobIdFromSubject('Orçamento Evento Tech - UJ-5-1715000000000');
    expect(result).toBe('UJ-5-1715000000000');
  });

  it('finds JOB_ID at start of subject', () => {
    const result = parseJobIdFromSubject('UJ-42-1000000000000 - Evento Corporativo');
    expect(result).toBe('UJ-42-1000000000000');
  });

  it('finds JOB_ID embedded in complex subject', () => {
    const result = parseJobIdFromSubject('Re: [Urgente] Cotação Referente ao Job UJ-99-2000000000000 - Por favor revisar');
    expect(result).toBe('UJ-99-2000000000000');
  });

  it('returns null when no JOB_ID in subject', () => {
    const result = parseJobIdFromSubject('Orçamento sem identificação de job');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseJobIdFromSubject('');
    expect(result).toBeNull();
  });
});

describe('JobId - jobIdMustBeInSubject', () => {
  it('returns true when subject contains the jobId', () => {
    expect(jobIdMustBeInSubject('Cotação Job UJ-5-1715000000000', 'UJ-5-1715000000000')).toBe(true);
  });

  it('returns false when subject does not contain the jobId', () => {
    expect(jobIdMustBeInSubject('Cotação genérica sem identificação', 'UJ-5-1715000000000')).toBe(false);
  });

  it('returns false for empty subject', () => {
    expect(jobIdMustBeInSubject('', 'UJ-5-1715000000000')).toBe(false);
  });
});

describe('Email subject rule - sending without JOB_ID is invalid', () => {
  it('email subject without JOB_ID violates the rule', () => {
    const jobId = 'UJ-5-1715000000000';
    const invalidSubject = 'Cotação para Evento de Lançamento';
    expect(jobIdMustBeInSubject(invalidSubject, jobId)).toBe(false);
  });

  it('email subject with JOB_ID satisfies the rule', () => {
    const jobId = 'UJ-5-1715000000000';
    const validSubject = `Cotação para Evento de Lançamento - ${jobId}`;
    expect(jobIdMustBeInSubject(validSubject, jobId)).toBe(true);
  });

  it('extracted jobId from subject must be valid format', () => {
    const subject = 'Orçamento - UJ-7-1715099900000 - Evento Corporativo';
    const extracted = parseJobIdFromSubject(subject);
    expect(extracted).not.toBeNull();
    if (extracted !== null) {
      expect(isValidJobId(extracted)).toBe(true);
    }
  });
});
