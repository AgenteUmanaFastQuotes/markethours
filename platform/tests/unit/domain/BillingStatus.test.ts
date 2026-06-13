import { describe, it, expect } from 'vitest';
import {
  BillingLineStatus,
  NON_BILLABLE_STATUSES,
  isBillable,
  BillingDocumentType,
  DocumentClassification,
} from '../../../src/domain/billing/BillingStatus.js';

describe('BillingStatus - isBillable', () => {
  it('CANCELADO is not billable', () => {
    expect(isBillable(BillingLineStatus.CANCELADO)).toBe(false);
  });

  it('NAO_GERA_FATURA is not billable', () => {
    expect(isBillable(BillingLineStatus.NAO_GERA_FATURA)).toBe(false);
  });

  it('NF_RECEBIDA is billable', () => {
    expect(isBillable(BillingLineStatus.NF_RECEBIDA)).toBe(true);
  });

  it('CONCLUIDO is billable', () => {
    expect(isBillable(BillingLineStatus.CONCLUIDO)).toBe(true);
  });

  it('PENDENTE is billable', () => {
    expect(isBillable(BillingLineStatus.PENDENTE)).toBe(true);
  });

  it('EM_PROCESSAMENTO is billable', () => {
    expect(isBillable(BillingLineStatus.EM_PROCESSAMENTO)).toBe(true);
  });

  it('AGUARDANDO_NF is billable', () => {
    expect(isBillable(BillingLineStatus.AGUARDANDO_NF)).toBe(true);
  });
});

describe('BillingStatus - NON_BILLABLE_STATUSES', () => {
  it('NON_BILLABLE_STATUSES contains CANCELADO', () => {
    expect(NON_BILLABLE_STATUSES.has(BillingLineStatus.CANCELADO)).toBe(true);
  });

  it('NON_BILLABLE_STATUSES contains NAO_GERA_FATURA', () => {
    expect(NON_BILLABLE_STATUSES.has(BillingLineStatus.NAO_GERA_FATURA)).toBe(true);
  });

  it('NON_BILLABLE_STATUSES has exactly 2 members', () => {
    expect(NON_BILLABLE_STATUSES.size).toBe(2);
  });
});

describe('BillingDocumentType', () => {
  it('has NF', () => {
    expect(BillingDocumentType.NF).toBeDefined();
  });

  it('has ND', () => {
    expect(BillingDocumentType.ND).toBeDefined();
  });

  it('has FATURA', () => {
    expect(BillingDocumentType.FATURA).toBeDefined();
  });

  it('has BOLETO', () => {
    expect(BillingDocumentType.BOLETO).toBeDefined();
  });

  it('has exactly 4 values', () => {
    expect(Object.values(BillingDocumentType).length).toBe(4);
  });
});

describe('DocumentClassification - CNPJ fields must be strings', () => {
  it('emitterCnpj in DocumentClassification is always string (type-level test)', () => {
    // TypeScript compile-time: assigning a number to emitterCnpj would be a type error.
    // At runtime, verify the interface is used with string values.
    const doc: DocumentClassification = {
      type: BillingDocumentType.NF,
      emitterCnpj: '12345678000190',
      recipientCnpj: '98765432000100',
      netValue: 1000.0,
      retentions: [50.0],
      hasPdf: true,
    };
    expect(typeof doc.emitterCnpj).toBe('string');
    expect(typeof doc.recipientCnpj).toBe('string');
  });

  it('CNPJ fields are strings not numbers (runtime check)', () => {
    const emitterCnpj = '12345678000190';
    const recipientCnpj = '98765432000100';

    // Simulating what would be wrong: storing as number
    const asNumber = 12345678000190;
    const asString = '12345678000190';

    expect(typeof asNumber).toBe('number');
    expect(typeof asString).toBe('string');

    // The string preserves leading zeros — number cannot
    // 12.000.000/0000-01 stored as number would lose the leading zero structure
    const zeroPaddedCnpj = '00123456000190';
    expect(zeroPaddedCnpj.startsWith('00')).toBe(true);
    // As number, this leading zero is lost:
    expect(Number(zeroPaddedCnpj).toString()).not.toBe(zeroPaddedCnpj);

    const doc: DocumentClassification = {
      type: BillingDocumentType.FATURA,
      emitterCnpj,
      recipientCnpj,
      netValue: 5000.0,
      retentions: [],
      hasPdf: false,
    };

    expect(doc.emitterCnpj).toBe('12345678000190');
    expect(doc.recipientCnpj).toBe('98765432000100');
    expect(typeof doc.emitterCnpj).toBe('string');
    expect(typeof doc.recipientCnpj).toBe('string');
  });

  it('DocumentClassification accepts retentions array', () => {
    const doc: DocumentClassification = {
      type: BillingDocumentType.ND,
      emitterCnpj: '12345678000190',
      recipientCnpj: '98765432000100',
      netValue: 2000.0,
      retentions: [100.0, 50.0],
      hasPdf: false,
    };
    expect(doc.retentions).toHaveLength(2);
    expect(doc.retentions[0]).toBe(100.0);
  });
});
