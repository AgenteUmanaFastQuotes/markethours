import { describe, it, expect } from 'vitest';
import {
  FastQuoteStatus,
  PROTECTED_STATUSES,
  TERMINAL_STATUSES,
  isProtectedFromDeadlineChange,
  isTerminal,
  canTransition,
  parseLegacyStatus,
} from '../../../src/domain/fastquotes/FastQuoteStatus.js';

describe('FastQuoteStatus - Protected statuses', () => {
  it('ENVIADO is protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.ENVIADO)).toBe(true);
  });

  it('RECEBIDO is protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.RECEBIDO)).toBe(true);
  });

  it('EM_CONTATO is protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.EM_CONTATO)).toBe(true);
  });

  it('CANCELADO is protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('RASCUNHO is NOT protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.RASCUNHO)).toBe(false);
  });

  it('AGUARDANDO_ENVIO is NOT protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(false);
  });

  it('ERRO is NOT protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.ERRO)).toBe(false);
  });

  it('PRECISA_REGENERAR is NOT protected from deadline change', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.PRECISA_REGENERAR)).toBe(false);
  });

  it('PROTECTED_STATUSES set has exactly 4 members', () => {
    expect(PROTECTED_STATUSES.size).toBe(4);
  });
});

describe('FastQuoteStatus - Terminal statuses', () => {
  it('CANCELADO is terminal', () => {
    expect(isTerminal(FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('RECEBIDO is terminal', () => {
    expect(isTerminal(FastQuoteStatus.RECEBIDO)).toBe(true);
  });

  it('RASCUNHO is not terminal', () => {
    expect(isTerminal(FastQuoteStatus.RASCUNHO)).toBe(false);
  });

  it('TERMINAL_STATUSES set has exactly 2 members', () => {
    expect(TERMINAL_STATUSES.size).toBe(2);
  });
});

describe('FastQuoteStatus - Valid transitions', () => {
  it('RASCUNHO → AGUARDANDO_ENVIO', () => {
    expect(canTransition(FastQuoteStatus.RASCUNHO, FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(true);
  });

  it('RASCUNHO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.RASCUNHO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('AGUARDANDO_ENVIO → ENVIADO', () => {
    expect(canTransition(FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.ENVIADO)).toBe(true);
  });

  it('AGUARDANDO_ENVIO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('AGUARDANDO_ENVIO → PRECISA_REGENERAR', () => {
    expect(canTransition(FastQuoteStatus.AGUARDANDO_ENVIO, FastQuoteStatus.PRECISA_REGENERAR)).toBe(true);
  });

  it('ENVIADO → EM_CONTATO', () => {
    expect(canTransition(FastQuoteStatus.ENVIADO, FastQuoteStatus.EM_CONTATO)).toBe(true);
  });

  it('ENVIADO → RECEBIDO', () => {
    expect(canTransition(FastQuoteStatus.ENVIADO, FastQuoteStatus.RECEBIDO)).toBe(true);
  });

  it('ENVIADO → REENVIAR_COTACAO', () => {
    expect(canTransition(FastQuoteStatus.ENVIADO, FastQuoteStatus.REENVIAR_COTACAO)).toBe(true);
  });

  it('ENVIADO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.ENVIADO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('ENVIADO → ERRO', () => {
    expect(canTransition(FastQuoteStatus.ENVIADO, FastQuoteStatus.ERRO)).toBe(true);
  });

  it('EM_CONTATO → RECEBIDO', () => {
    expect(canTransition(FastQuoteStatus.EM_CONTATO, FastQuoteStatus.RECEBIDO)).toBe(true);
  });

  it('EM_CONTATO → REENVIAR_COTACAO', () => {
    expect(canTransition(FastQuoteStatus.EM_CONTATO, FastQuoteStatus.REENVIAR_COTACAO)).toBe(true);
  });

  it('EM_CONTATO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.EM_CONTATO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('REENVIAR_COTACAO → AGUARDANDO_ENVIO', () => {
    expect(canTransition(FastQuoteStatus.REENVIAR_COTACAO, FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(true);
  });

  it('REENVIAR_COTACAO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.REENVIAR_COTACAO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('ERRO → AGUARDANDO_ENVIO', () => {
    expect(canTransition(FastQuoteStatus.ERRO, FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(true);
  });

  it('ERRO → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.ERRO, FastQuoteStatus.CANCELADO)).toBe(true);
  });

  it('PRECISA_REGENERAR → AGUARDANDO_ENVIO', () => {
    expect(canTransition(FastQuoteStatus.PRECISA_REGENERAR, FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(true);
  });

  it('PRECISA_REGENERAR → CANCELADO', () => {
    expect(canTransition(FastQuoteStatus.PRECISA_REGENERAR, FastQuoteStatus.CANCELADO)).toBe(true);
  });
});

describe('FastQuoteStatus - Invalid transitions', () => {
  it('RECEBIDO → RASCUNHO is false (terminal)', () => {
    expect(canTransition(FastQuoteStatus.RECEBIDO, FastQuoteStatus.RASCUNHO)).toBe(false);
  });

  it('RECEBIDO → CANCELADO is false (terminal)', () => {
    expect(canTransition(FastQuoteStatus.RECEBIDO, FastQuoteStatus.CANCELADO)).toBe(false);
  });

  it('RECEBIDO → ENVIADO is false (terminal)', () => {
    expect(canTransition(FastQuoteStatus.RECEBIDO, FastQuoteStatus.ENVIADO)).toBe(false);
  });

  it('CANCELADO → RASCUNHO is false (terminal)', () => {
    expect(canTransition(FastQuoteStatus.CANCELADO, FastQuoteStatus.RASCUNHO)).toBe(false);
  });

  it('CANCELADO → AGUARDANDO_ENVIO is false (terminal)', () => {
    expect(canTransition(FastQuoteStatus.CANCELADO, FastQuoteStatus.AGUARDANDO_ENVIO)).toBe(false);
  });

  it('RASCUNHO → RECEBIDO directly is false', () => {
    expect(canTransition(FastQuoteStatus.RASCUNHO, FastQuoteStatus.RECEBIDO)).toBe(false);
  });

  it('RASCUNHO → ENVIADO directly is false', () => {
    expect(canTransition(FastQuoteStatus.RASCUNHO, FastQuoteStatus.ENVIADO)).toBe(false);
  });
});

describe('FastQuoteStatus - Legacy status parsing', () => {
  it('"PRECISA REGENERAR" → PRECISA_REGENERAR', () => {
    expect(parseLegacyStatus('PRECISA REGENERAR')).toBe(FastQuoteStatus.PRECISA_REGENERAR);
  });

  it('"AGUARDANDO ENVIO" → AGUARDANDO_ENVIO', () => {
    expect(parseLegacyStatus('AGUARDANDO ENVIO')).toBe(FastQuoteStatus.AGUARDANDO_ENVIO);
  });

  it('"EM CONTATO" → EM_CONTATO', () => {
    expect(parseLegacyStatus('EM CONTATO')).toBe(FastQuoteStatus.EM_CONTATO);
  });

  it('"REENVIAR COTAÇÃO" → REENVIAR_COTACAO', () => {
    expect(parseLegacyStatus('REENVIAR COTAÇÃO')).toBe(FastQuoteStatus.REENVIAR_COTACAO);
  });

  it('unknown string → null', () => {
    expect(parseLegacyStatus('COMPLETELY_UNKNOWN')).toBeNull();
  });

  it('empty string → null', () => {
    expect(parseLegacyStatus('')).toBeNull();
  });

  it('"RASCUNHO" parses correctly', () => {
    expect(parseLegacyStatus('RASCUNHO')).toBe(FastQuoteStatus.RASCUNHO);
  });

  it('"CANCELADO" parses correctly', () => {
    expect(parseLegacyStatus('CANCELADO')).toBe(FastQuoteStatus.CANCELADO);
  });

  it('parsing is case-insensitive via toUpperCase (lowercase input)', () => {
    expect(parseLegacyStatus('cancelado')).toBe(FastQuoteStatus.CANCELADO);
  });
});

describe('FastQuoteStatus - Return deadline change regeneration logic', () => {
  it('lines with non-protected statuses should need regeneration when deadline changes', () => {
    const allStatuses = Object.values(FastQuoteStatus);
    const nonProtected = allStatuses.filter((s) => !isProtectedFromDeadlineChange(s));

    // All non-protected statuses should require regeneration on deadline change
    expect(nonProtected).toContain(FastQuoteStatus.RASCUNHO);
    expect(nonProtected).toContain(FastQuoteStatus.AGUARDANDO_ENVIO);
    expect(nonProtected).toContain(FastQuoteStatus.ERRO);
    expect(nonProtected).toContain(FastQuoteStatus.PRECISA_REGENERAR);
    expect(nonProtected).toContain(FastQuoteStatus.REENVIAR_COTACAO);
  });

  it('protected statuses should NOT need regeneration when deadline changes', () => {
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.ENVIADO)).toBe(true);
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.RECEBIDO)).toBe(true);
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.EM_CONTATO)).toBe(true);
    expect(isProtectedFromDeadlineChange(FastQuoteStatus.CANCELADO)).toBe(true);
  });
});
