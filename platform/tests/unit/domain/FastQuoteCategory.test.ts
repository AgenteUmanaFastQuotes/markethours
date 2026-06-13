import { describe, it, expect } from 'vitest';
import {
  FastQuoteCategory,
  ALL_CATEGORIES,
  isValidCategory,
  parseCategoryFromAI,
  EventType,
} from '../../../src/domain/fastquotes/FastQuoteCategory.js';

describe('FastQuoteCategory - ALL_CATEGORIES', () => {
  it('has exactly 19 entries', () => {
    expect(ALL_CATEGORIES.length).toBe(19);
  });

  it('contains all expected categories', () => {
    expect(ALL_CATEGORIES).toContain(FastQuoteCategory.AB);
    expect(ALL_CATEGORIES).toContain(FastQuoteCategory.HOSPEDAGEM);
    expect(ALL_CATEGORIES).toContain(FastQuoteCategory.OUTROS);
    expect(ALL_CATEGORIES).toContain(FastQuoteCategory.CENOGRAFIA);
    expect(ALL_CATEGORIES).toContain(FastQuoteCategory.SEGURO);
  });
});

describe('FastQuoteCategory - isValidCategory', () => {
  it('accepts A&B category value', () => {
    expect(isValidCategory(FastQuoteCategory.AB)).toBe(true);
  });

  it('accepts HOSPEDAGEM', () => {
    expect(isValidCategory(FastQuoteCategory.HOSPEDAGEM)).toBe(true);
  });

  it('accepts all known categories', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(isValidCategory(cat)).toBe(true);
    }
  });

  it('rejects unknown string', () => {
    expect(isValidCategory('UNKNOWN_CATEGORY')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCategory('')).toBe(false);
  });

  it('rejects partial match', () => {
    expect(isValidCategory('HOSPEDAGEM EXTRA')).toBe(false);
  });
});

describe('FastQuoteCategory - parseCategoryFromAI', () => {
  it('normalizes "a&b" → AB', () => {
    expect(parseCategoryFromAI('a&b')).toBe(FastQuoteCategory.AB);
  });

  it('normalizes "A&B" → AB', () => {
    expect(parseCategoryFromAI('A&B')).toBe(FastQuoteCategory.AB);
  });

  it('normalizes "HOSPEDAGEM" → HOSPEDAGEM', () => {
    expect(parseCategoryFromAI('HOSPEDAGEM')).toBe(FastQuoteCategory.HOSPEDAGEM);
  });

  it('normalizes "hospedagem" (lowercase) → HOSPEDAGEM', () => {
    expect(parseCategoryFromAI('hospedagem')).toBe(FastQuoteCategory.HOSPEDAGEM);
  });

  it('normalizes "cenografia" → CENOGRAFIA', () => {
    expect(parseCategoryFromAI('cenografia')).toBe(FastQuoteCategory.CENOGRAFIA);
  });

  it('normalizes "CENOGRAFIA" → CENOGRAFIA', () => {
    expect(parseCategoryFromAI('CENOGRAFIA')).toBe(FastQuoteCategory.CENOGRAFIA);
  });

  it('handles accented input: full category name with accents → LOCACAO_ESPACO', () => {
    expect(parseCategoryFromAI('LOCAÇÃO DE ESPAÇO')).toBe(FastQuoteCategory.LOCACAO_ESPACO);
  });

  it('handles unaccented alias: "locacao espaco" → LOCACAO_ESPACO', () => {
    expect(parseCategoryFromAI('locacao espaco')).toBe(FastQuoteCategory.LOCACAO_ESPACO);
  });

  it('returns null for completely unknown category', () => {
    expect(parseCategoryFromAI('CATEGORIA_INEXISTENTE_XYZ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCategoryFromAI('')).toBeNull();
  });

  it('handles "seguro" (lowercase)', () => {
    expect(parseCategoryFromAI('seguro')).toBe(FastQuoteCategory.SEGURO);
  });

  it('handles "outros" (lowercase)', () => {
    expect(parseCategoryFromAI('outros')).toBe(FastQuoteCategory.OUTROS);
  });
});

describe('EventType', () => {
  it('has all 9 values', () => {
    const values = Object.values(EventType);
    expect(values.length).toBe(9);
  });

  it('contains CONVENCAO_VENDAS', () => {
    expect(EventType.CONVENCAO_VENDAS).toBeDefined();
  });

  it('contains STAND_CONGRESSO', () => {
    expect(EventType.STAND_CONGRESSO).toBeDefined();
  });

  it('contains TREINAMENTO', () => {
    expect(EventType.TREINAMENTO).toBeDefined();
  });

  it('contains JANTAR_PREMIACAO', () => {
    expect(EventType.JANTAR_PREMIACAO).toBeDefined();
  });

  it('contains CONFRATERNIZACAO', () => {
    expect(EventType.CONFRATERNIZACAO).toBeDefined();
  });

  it('contains LANCAMENTO', () => {
    expect(EventType.LANCAMENTO).toBeDefined();
  });

  it('contains EVENTO_RESIDENCIAL', () => {
    expect(EventType.EVENTO_RESIDENCIAL).toBeDefined();
  });

  it('contains CORPORATIVO_GERAL', () => {
    expect(EventType.CORPORATIVO_GERAL).toBeDefined();
  });

  it('contains MINI_MEETING', () => {
    expect(EventType.MINI_MEETING).toBeDefined();
  });
});
