import { describe, it, expect } from 'vitest';
import {
  ContactStatus,
  ContactSource,
  ContactConfidence,
  SupplierContact,
  evaluateContactGovernance,
  newContactFromFastQuotes,
} from '../../../src/domain/suppliers/SupplierContact.js';

function makeContact(overrides: Partial<SupplierContact> = {}): SupplierContact {
  return {
    id: 'contact-1',
    supplierCnpj: '12345678000190',
    contactName: 'João Silva',
    contactEmail: 'joao@example.com',
    status: ContactStatus.CONFIRMADO,
    source: ContactSource.FASTQUOTES,
    confidence: ContactConfidence.ALTA,
    preferredForFastQuotes: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('SupplierContact Governance - No CNPJ supplier', () => {
  it('supplier without CNPJ → ALLOW_MANUAL_NO_CNPJ', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: null,
      proposedEmail: 'test@example.com',
      existingContact: null,
    });
    expect(result.outcome).toBe('ALLOW_MANUAL_NO_CNPJ');
  });

  it('supplier without CNPJ never blocks, even with existing contact', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: null,
      proposedEmail: 'test@example.com',
      existingContact: makeContact({ supplierCnpj: null }),
    });
    expect(result.outcome).toBe('ALLOW_MANUAL_NO_CNPJ');
  });

  it('supplier without CNPJ never requires modal', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: null,
      proposedEmail: 'new@example.com',
      existingContact: null,
    });
    expect(result.outcome).not.toBe('REQUIRES_CONTACT_MODAL');
  });
});

describe('SupplierContact Governance - CNPJ supplier, no existing contact', () => {
  it('CNPJ supplier + no existing contact + new email → REQUIRES_CONTACT_MODAL', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'new@example.com',
      existingContact: null,
    });
    expect(result.outcome).toBe('REQUIRES_CONTACT_MODAL');
  });

  it('REQUIRES_CONTACT_MODAL has reason CNPJ_SUPPLIER_NEW_EMAIL', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'new@example.com',
      existingContact: null,
    });
    if (result.outcome === 'REQUIRES_CONTACT_MODAL') {
      expect(result.reason).toBe('CNPJ_SUPPLIER_NEW_EMAIL');
    } else {
      expect.fail('Expected REQUIRES_CONTACT_MODAL');
    }
  });
});

describe('SupplierContact Governance - CNPJ supplier, existing contact with empty name', () => {
  it('CNPJ supplier + existing contact with empty name → REQUIRES_NAME_COMPLETION', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: '' }),
    });
    expect(result.outcome).toBe('REQUIRES_NAME_COMPLETION');
  });

  it('REQUIRES_NAME_COMPLETION includes the contact', () => {
    const contact = makeContact({ contactName: '' });
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: contact,
    });
    if (result.outcome === 'REQUIRES_NAME_COMPLETION') {
      expect(result.contact).toBe(contact);
    } else {
      expect.fail('Expected REQUIRES_NAME_COMPLETION');
    }
  });

  it('whitespace-only name also triggers REQUIRES_NAME_COMPLETION', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: '   ' }),
    });
    expect(result.outcome).toBe('REQUIRES_NAME_COMPLETION');
  });
});

describe('SupplierContact Governance - CNPJ supplier, existing contact with matching name', () => {
  it('same name as proposed → READY', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: 'João Silva' }),
      proposedName: 'João Silva',
    });
    expect(result.outcome).toBe('READY');
  });

  it('READY includes the contact', () => {
    const contact = makeContact({ contactName: 'João Silva' });
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: contact,
      proposedName: 'João Silva',
    });
    if (result.outcome === 'READY') {
      expect(result.contact).toBe(contact);
    } else {
      expect.fail('Expected READY');
    }
  });

  it('no proposed name + existing name → READY', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: 'João Silva' }),
    });
    expect(result.outcome).toBe('READY');
  });
});

describe('SupplierContact Governance - CNPJ supplier, existing contact with different name', () => {
  it('different name → SYNC_CONTACT_NAME', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: 'João Silva' }),
      proposedName: 'João Santos',
    });
    expect(result.outcome).toBe('SYNC_CONTACT_NAME');
  });

  it('SYNC_CONTACT_NAME includes the new name', () => {
    const result = evaluateContactGovernance({
      supplierCnpj: '12345678000190',
      proposedEmail: 'joao@example.com',
      existingContact: makeContact({ contactName: 'João Silva' }),
      proposedName: 'João Santos',
    });
    if (result.outcome === 'SYNC_CONTACT_NAME') {
      expect(result.newName).toBe('João Santos');
    } else {
      expect.fail('Expected SYNC_CONTACT_NAME');
    }
  });
});

describe('newContactFromFastQuotes', () => {
  it('always sets status = NAO_CONFIRMADO', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: '12345678000190',
      name: 'Supplier Name',
      email: 'supplier@example.com',
      preferredForFastQuotes: true,
    });
    expect(contact.status).toBe(ContactStatus.NAO_CONFIRMADO);
  });

  it('always sets source = FASTQUOTES', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: '12345678000190',
      name: 'Supplier Name',
      email: 'supplier@example.com',
      preferredForFastQuotes: false,
    });
    expect(contact.source).toBe(ContactSource.FASTQUOTES);
  });

  it('always sets confidence = BAIXA', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: '12345678000190',
      name: 'Supplier Name',
      email: 'supplier@example.com',
      preferredForFastQuotes: true,
    });
    expect(contact.confidence).toBe(ContactConfidence.BAIXA);
  });

  it('sets supplierCnpj when CNPJ is provided', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: '12345678000190',
      name: 'Supplier Name',
      email: 'supplier@example.com',
      preferredForFastQuotes: true,
    });
    expect(contact.supplierCnpj).toBe('12345678000190');
  });

  it('sets supplierCnpj = null for no-CNPJ supplier', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: null,
      name: 'Individual Supplier',
      email: 'individual@example.com',
      preferredForFastQuotes: false,
    });
    expect(contact.supplierCnpj).toBeNull();
  });

  it('sets contactName and contactEmail correctly', () => {
    const contact = newContactFromFastQuotes({
      supplierCnpj: null,
      name: 'Test Person',
      email: 'test@person.com',
      preferredForFastQuotes: false,
    });
    expect(contact.contactName).toBe('Test Person');
    expect(contact.contactEmail).toBe('test@person.com');
  });
});
