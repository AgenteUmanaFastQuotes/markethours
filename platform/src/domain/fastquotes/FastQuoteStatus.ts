export enum FastQuoteStatus {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_ENVIO = 'AGUARDANDO_ENVIO',
  ENVIADO = 'ENVIADO',
  EM_CONTATO = 'EM_CONTATO',
  RECEBIDO = 'RECEBIDO',
  REENVIAR_COTACAO = 'REENVIAR_COTACAO',
  CANCELADO = 'CANCELADO',
  ERRO = 'ERRO',
  PRECISA_REGENERAR = 'PRECISA_REGENERAR',
}

/**
 * Statuses that are protected from return-deadline-triggered regeneration.
 * Lines in these statuses should not be auto-regenerated when the return deadline changes.
 */
export const PROTECTED_STATUSES: ReadonlySet<FastQuoteStatus> = new Set([
  FastQuoteStatus.ENVIADO,
  FastQuoteStatus.RECEBIDO,
  FastQuoteStatus.EM_CONTATO,
  FastQuoteStatus.CANCELADO,
]);

/**
 * Terminal statuses — once reached, no further transitions are allowed.
 */
export const TERMINAL_STATUSES: ReadonlySet<FastQuoteStatus> = new Set([
  FastQuoteStatus.CANCELADO,
  FastQuoteStatus.RECEBIDO,
]);

export function isProtectedFromDeadlineChange(status: FastQuoteStatus): boolean {
  return PROTECTED_STATUSES.has(status);
}

export function isTerminal(status: FastQuoteStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

const ALLOWED_TRANSITIONS: ReadonlyMap<FastQuoteStatus, ReadonlySet<FastQuoteStatus>> = new Map([
  [
    FastQuoteStatus.RASCUNHO,
    new Set([FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.CANCELADO]),
  ],
  [
    FastQuoteStatus.AGUARDANDO_ENVIO,
    new Set([FastQuoteStatus.ENVIADO, FastQuoteStatus.CANCELADO, FastQuoteStatus.PRECISA_REGENERAR]),
  ],
  [
    FastQuoteStatus.ENVIADO,
    new Set([
      FastQuoteStatus.EM_CONTATO,
      FastQuoteStatus.RECEBIDO,
      FastQuoteStatus.REENVIAR_COTACAO,
      FastQuoteStatus.CANCELADO,
      FastQuoteStatus.ERRO,
    ]),
  ],
  [
    FastQuoteStatus.EM_CONTATO,
    new Set([FastQuoteStatus.RECEBIDO, FastQuoteStatus.REENVIAR_COTACAO, FastQuoteStatus.CANCELADO]),
  ],
  [FastQuoteStatus.RECEBIDO, new Set()],
  [
    FastQuoteStatus.REENVIAR_COTACAO,
    new Set([FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.CANCELADO]),
  ],
  [FastQuoteStatus.CANCELADO, new Set()],
  [
    FastQuoteStatus.ERRO,
    new Set([FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.CANCELADO]),
  ],
  [
    FastQuoteStatus.PRECISA_REGENERAR,
    new Set([FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.CANCELADO]),
  ],
]);

export function canTransition(from: FastQuoteStatus, to: FastQuoteStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  if (allowed === undefined) return false;
  return allowed.has(to);
}

/**
 * Maps legacy spreadsheet string values to FastQuoteStatus enum values.
 */
export const LEGACY_STATUS_MAP: ReadonlyMap<string, FastQuoteStatus> = new Map([
  ['RASCUNHO', FastQuoteStatus.RASCUNHO],
  ['AGUARDANDO ENVIO', FastQuoteStatus.AGUARDANDO_ENVIO],
  ['AGUARDANDO_ENVIO', FastQuoteStatus.AGUARDANDO_ENVIO],
  ['ENVIADO', FastQuoteStatus.ENVIADO],
  ['EM CONTATO', FastQuoteStatus.EM_CONTATO],
  ['EM_CONTATO', FastQuoteStatus.EM_CONTATO],
  ['RECEBIDO', FastQuoteStatus.RECEBIDO],
  ['REENVIAR COTAÇÃO', FastQuoteStatus.REENVIAR_COTACAO],
  ['REENVIAR COTACAO', FastQuoteStatus.REENVIAR_COTACAO],
  ['REENVIAR_COTACAO', FastQuoteStatus.REENVIAR_COTACAO],
  ['CANCELADO', FastQuoteStatus.CANCELADO],
  ['ERRO', FastQuoteStatus.ERRO],
  ['PRECISA REGENERAR', FastQuoteStatus.PRECISA_REGENERAR],
  ['PRECISA_REGENERAR', FastQuoteStatus.PRECISA_REGENERAR],
]);

export function parseLegacyStatus(raw: string): FastQuoteStatus | null {
  const normalized = raw.trim().toUpperCase();
  return LEGACY_STATUS_MAP.get(normalized) ?? null;
}
