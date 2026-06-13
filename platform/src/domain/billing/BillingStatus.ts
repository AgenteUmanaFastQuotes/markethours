export enum BillingLineStatus {
  PENDENTE = 'PENDENTE',
  EM_PROCESSAMENTO = 'EM_PROCESSAMENTO',
  AGUARDANDO_NF = 'AGUARDANDO_NF',
  NF_RECEBIDA = 'NF_RECEBIDA',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
  NAO_GERA_FATURA = 'NAO_GERA_FATURA',
}

export const NON_BILLABLE_STATUSES: ReadonlySet<BillingLineStatus> = new Set([
  BillingLineStatus.CANCELADO,
  BillingLineStatus.NAO_GERA_FATURA,
]);

export function isBillable(status: BillingLineStatus): boolean {
  return !NON_BILLABLE_STATUSES.has(status);
}

export enum BillingDocumentType {
  NF = 'NF',
  ND = 'ND',
  FATURA = 'FATURA',
  BOLETO = 'BOLETO',
}

export interface DocumentClassification {
  type: BillingDocumentType;
  /** CNPJ must always be stored as a string, never a number */
  emitterCnpj: string;
  /** CNPJ must always be stored as a string, never a number */
  recipientCnpj: string;
  netValue: number;
  retentions: number[];
  hasPdf: boolean;
}
