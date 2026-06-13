import { describe, it, expect } from 'vitest';
import {
  CndStatus,
  CndFlag,
  INFOSIMPLES_CODE_611_IS_NOT_DEBT,
  interpretInfosimplesCode,
  cndStatusFromConsultation,
} from '../../../src/domain/compliance/CndStatus.js';
import { parseCnpj } from '../../../src/domain/shared/index.js';

describe('CndStatus - InfoSimples code 611 (CRITICAL BUSINESS RULE)', () => {
  it('interpretInfosimplesCode(611) returns isDebt=false', () => {
    const result = interpretInfosimplesCode(611);
    expect(result.isDebt).toBe(false);
  });

  it('interpretInfosimplesCode(611) returns flag=ATENCAO', () => {
    const result = interpretInfosimplesCode(611);
    expect(result.flag).toBe(CndFlag.ATENCAO);
  });

  it('interpretInfosimplesCode(611) note contains "não representa débito"', () => {
    const result = interpretInfosimplesCode(611);
    expect(result.note).toContain('não representa débito');
  });

  it('interpretInfosimplesCode(611) requiresAttention=true', () => {
    const result = interpretInfosimplesCode(611);
    expect(result.requiresAttention).toBe(true);
  });

  it('INFOSIMPLES_CODE_611_IS_NOT_DEBT constant is true', () => {
    expect(INFOSIMPLES_CODE_611_IS_NOT_DEBT).toBe(true);
  });

  it('code 611 should NOT block supplier payment (isDebt=false means no debt)', () => {
    const result = interpretInfosimplesCode(611);
    // This is the critical business rule: 611 is operational irregularity, not debt
    expect(result.isDebt).toBe(false);
    expect(result.flag).toBe(CndFlag.ATENCAO);
    expect(result.requiresAttention).toBe(true);
  });
});

describe('CndStatus - cndStatusFromConsultation', () => {
  it('valid=true, hasDebts=false → OK', () => {
    const status = cndStatusFromConsultation({ valid: true, hasDebts: false });
    expect(status).toBe(CndStatus.OK);
  });

  it('valid=true, hasDebts=true → COM_DEBITOS', () => {
    const status = cndStatusFromConsultation({ valid: true, hasDebts: true });
    expect(status).toBe(CndStatus.COM_DEBITOS);
  });

  it('valid=false → IRREGULAR or SEM_CND (not OK)', () => {
    const status = cndStatusFromConsultation({ valid: false, hasDebts: false });
    expect([CndStatus.IRREGULAR, CndStatus.SEM_CND]).toContain(status);
    expect(status).not.toBe(CndStatus.OK);
  });

  it('valid=false, hasDebts=false → not COM_DEBITOS', () => {
    const status = cndStatusFromConsultation({ valid: false, hasDebts: false });
    expect(status).not.toBe(CndStatus.COM_DEBITOS);
  });
});

describe('CNPJ must be stored as string', () => {
  it('parseCnpj rejects numeric input (CNPJ cannot be a number)', () => {
    const result = parseCnpj(12345678000190);
    expect(result).toBeNull();
  });

  it('parseCnpj("12.345.678/0001-90") returns branded string with 14 digits stripped', () => {
    const result = parseCnpj('12.345.678/0001-90');
    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result).toBe('12345678000190');
      expect(result.length).toBe(14);
    }
  });

  it('parseCnpj(12345678000190) returns null — CNPJ cannot be a number', () => {
    expect(parseCnpj(12345678000190)).toBeNull();
  });

  it('parseCnpj returns null for non-string, non-number input', () => {
    expect(parseCnpj(null)).toBeNull();
    expect(parseCnpj(undefined)).toBeNull();
    expect(parseCnpj({})).toBeNull();
  });

  it('parseCnpj rejects CNPJ with wrong digit count', () => {
    expect(parseCnpj('1234567800019')).toBeNull(); // 13 digits
    expect(parseCnpj('123456780001900')).toBeNull(); // 15 digits
  });

  it('parseCnpj returns a string type (not number)', () => {
    const result = parseCnpj('12.345.678/0001-90');
    if (result !== null) {
      expect(typeof result).toBe('string');
    }
  });
});
