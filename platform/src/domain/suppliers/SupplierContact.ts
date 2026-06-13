export enum ContactStatus {
  NAO_CONFIRMADO = 'NAO_CONFIRMADO',
  CONFIRMADO = 'CONFIRMADO',
  ARQUIVADO = 'ARQUIVADO',
}

export enum ContactSource {
  FASTQUOTES = 'FASTQUOTES',
  MANUAL = 'MANUAL',
  IMPORTADO = 'IMPORTADO',
  FORMULARIO = 'FORMULARIO',
}

export enum ContactConfidence {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

export interface SupplierContact {
  id: string;
  supplierCnpj: string | null;
  contactName: string;
  contactEmail: string;
  status: ContactStatus;
  source: ContactSource;
  confidence: ContactConfidence;
  preferredForFastQuotes: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactGovernanceResult =
  | { outcome: 'REQUIRES_CONTACT_MODAL'; reason: 'CNPJ_SUPPLIER_NEW_EMAIL' }
  | { outcome: 'REQUIRES_NAME_COMPLETION'; contact: SupplierContact }
  | { outcome: 'SYNC_CONTACT_NAME'; contact: SupplierContact; newName: string }
  | { outcome: 'ALLOW_MANUAL_NO_CNPJ' }
  | { outcome: 'READY'; contact: SupplierContact };

export function evaluateContactGovernance(params: {
  supplierCnpj: string | null;
  proposedEmail: string;
  existingContact: SupplierContact | null;
  proposedName?: string;
}): ContactGovernanceResult {
  const { supplierCnpj, existingContact, proposedName } = params;

  // No CNPJ: manual flow, never blocked
  if (supplierCnpj === null) {
    return { outcome: 'ALLOW_MANUAL_NO_CNPJ' };
  }

  // CNPJ supplier with no existing contact: require contact modal
  if (existingContact === null) {
    return { outcome: 'REQUIRES_CONTACT_MODAL', reason: 'CNPJ_SUPPLIER_NEW_EMAIL' };
  }

  // Existing contact but missing name
  if (!existingContact.contactName || existingContact.contactName.trim() === '') {
    return { outcome: 'REQUIRES_NAME_COMPLETION', contact: existingContact };
  }

  // Existing contact with name - check if name differs from proposed
  if (
    proposedName !== undefined &&
    proposedName.trim() !== '' &&
    proposedName.trim() !== existingContact.contactName.trim()
  ) {
    return {
      outcome: 'SYNC_CONTACT_NAME',
      contact: existingContact,
      newName: proposedName.trim(),
    };
  }

  return { outcome: 'READY', contact: existingContact };
}

export function newContactFromFastQuotes(params: {
  supplierCnpj: string | null;
  name: string;
  email: string;
  preferredForFastQuotes: boolean;
}): Omit<SupplierContact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    supplierCnpj: params.supplierCnpj,
    contactName: params.name,
    contactEmail: params.email,
    status: ContactStatus.NAO_CONFIRMADO,
    source: ContactSource.FASTQUOTES,
    confidence: ContactConfidence.BAIXA,
    preferredForFastQuotes: params.preferredForFastQuotes,
  };
}
