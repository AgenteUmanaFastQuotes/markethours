export enum CndStatus {
  OK = 'OK',
  COM_DEBITOS = 'COM_DEBITOS',
  IRREGULAR = 'IRREGULAR',
  SEM_CND = 'SEM_CND',
  ERRO = 'ERRO',
  NAO_EMITIDA_ONLINE = 'NAO_EMITIDA_ONLINE',
  NAO_CONSULTADA = 'NAO_CONSULTADA',
  CONSULTANDO = 'CONSULTANDO',
}

export enum CndFlag {
  REGULAR = 'REGULAR',
  IRREGULAR = 'IRREGULAR',
  ATENCAO = 'ATENCAO',
  NAO_VERIFICADO = 'NAO_VERIFICADO',
}

/**
 * InfoSimples error code 611 indicates operational irregularity, NOT supplier debt.
 */
export const INFOSIMPLES_CODE_611_IS_NOT_DEBT = true;

export function interpretInfosimplesCode(code: number): {
  flag: CndFlag;
  requiresAttention: boolean;
  isDebt: boolean;
  note: string;
} {
  if (code === 611) {
    return {
      flag: CndFlag.ATENCAO,
      requiresAttention: true,
      isDebt: false,
      note: 'Código 611: irregularidade operacional - não representa débito do fornecedor',
    };
  }

  // Default: unknown codes are treated as needing attention
  return {
    flag: CndFlag.NAO_VERIFICADO,
    requiresAttention: true,
    isDebt: false,
    note: `Código ${code}: não mapeado`,
  };
}

export function cndStatusFromConsultation(params: {
  valid: boolean;
  hasDebts: boolean;
  infosimplesCode?: number;
}): CndStatus {
  const { valid, hasDebts } = params;

  if (!valid) {
    return CndStatus.IRREGULAR;
  }

  if (hasDebts) {
    return CndStatus.COM_DEBITOS;
  }

  return CndStatus.OK;
}
