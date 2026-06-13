export enum FastQuoteCategory {
  AB = 'A&B',
  ARTISTICO_PALESTRAS_MC = 'ARTÍSTICO, PALESTRAS & MC',
  ATIVACAO_TEAM_BUILDING = 'ATIVAÇÃO, TEAM BUILDING, DINÂMICAS & TREINAMENTO',
  CENOGRAFIA = 'CENOGRAFIA',
  GRAFICO_BRINDES = 'FORNECEDOR GRÁFICO E BRINDES',
  HOSPEDAGEM = 'HOSPEDAGEM',
  LOCACAO_ESPACO = 'LOCAÇÃO DE ESPAÇO',
  LOCACAO_MOBILIARIO = 'LOCAÇÃO MOBILIÁRIO',
  LOCACAO_TECNICA = 'LOCAÇÃO TÉCNICA E EQUIPAMENTOS',
  LOGISTICA_AEREA = 'LOGÍSTICA AÉREA, TERRESTRE E TRANSFER',
  LOGISTICA_CARGA = 'LOGÍSTICA CARGA',
  PRODUCAO_MASTER = 'PRODUÇÃO MASTER OU EXECUTIVA',
  TIME_PRODUCAO = 'TIME DE PRODUÇÃO (APOIO, CAMPO)',
  DIRECAO_ARTISTICA = 'DIREÇÃO ARTÍSTICA',
  DIRECAO_TECNICA = 'DIREÇÃO TECNICA',
  SEGURO = 'SEGURO',
  TRADUCAO_SIMULTANEA = 'TRADUÇÃO SIMULTÂNEA',
  RESTAURANTE = 'RESTAURANTE',
  OUTROS = 'OUTROS',
}

export const ALL_CATEGORIES: readonly FastQuoteCategory[] = Object.values(FastQuoteCategory);

export function isValidCategory(value: string): value is FastQuoteCategory {
  return ALL_CATEGORIES.includes(value as FastQuoteCategory);
}

/**
 * Normalize a string for loose comparison: lowercase, remove accents, trim whitespace.
 */
function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const NORMALIZED_CATEGORY_MAP: Map<string, FastQuoteCategory> = new Map(
  ALL_CATEGORIES.map((cat) => [normalize(cat), cat]),
);

// Additional AI alias normalizations
const AI_ALIASES: ReadonlyMap<string, FastQuoteCategory> = new Map([
  ['a&b', FastQuoteCategory.AB],
  ['a & b', FastQuoteCategory.AB],
  ['alimentos e bebidas', FastQuoteCategory.AB],
  ['artistico palestras mc', FastQuoteCategory.ARTISTICO_PALESTRAS_MC],
  ['artistico, palestras & mc', FastQuoteCategory.ARTISTICO_PALESTRAS_MC],
  ['ativacao team building', FastQuoteCategory.ATIVACAO_TEAM_BUILDING],
  ['cenografia', FastQuoteCategory.CENOGRAFIA],
  ['grafico brindes', FastQuoteCategory.GRAFICO_BRINDES],
  ['fornecedor grafico e brindes', FastQuoteCategory.GRAFICO_BRINDES],
  ['hospedagem', FastQuoteCategory.HOSPEDAGEM],
  ['locacao espaco', FastQuoteCategory.LOCACAO_ESPACO],
  ['locacao de espaco', FastQuoteCategory.LOCACAO_ESPACO],
  ['locacao mobiliario', FastQuoteCategory.LOCACAO_MOBILIARIO],
  ['locacao tecnica', FastQuoteCategory.LOCACAO_TECNICA],
  ['locacao tecnica e equipamentos', FastQuoteCategory.LOCACAO_TECNICA],
  ['logistica aerea', FastQuoteCategory.LOGISTICA_AEREA],
  ['logistica aerea, terrestre e transfer', FastQuoteCategory.LOGISTICA_AEREA],
  ['logistica carga', FastQuoteCategory.LOGISTICA_CARGA],
  ['producao master', FastQuoteCategory.PRODUCAO_MASTER],
  ['producao master ou executiva', FastQuoteCategory.PRODUCAO_MASTER],
  ['time de producao', FastQuoteCategory.TIME_PRODUCAO],
  ['time producao', FastQuoteCategory.TIME_PRODUCAO],
  ['direcao artistica', FastQuoteCategory.DIRECAO_ARTISTICA],
  ['direcao tecnica', FastQuoteCategory.DIRECAO_TECNICA],
  ['seguro', FastQuoteCategory.SEGURO],
  ['traducao simultanea', FastQuoteCategory.TRADUCAO_SIMULTANEA],
  ['restaurante', FastQuoteCategory.RESTAURANTE],
  ['outros', FastQuoteCategory.OUTROS],
]);

export function parseCategoryFromAI(raw: string): FastQuoteCategory | null {
  const norm = normalize(raw);

  // Try exact normalized match against enum values
  const direct = NORMALIZED_CATEGORY_MAP.get(norm);
  if (direct !== undefined) return direct;

  // Try alias map
  const alias = AI_ALIASES.get(norm);
  if (alias !== undefined) return alias;

  return null;
}

export enum EventType {
  CONVENCAO_VENDAS = 'CONVENCAO_VENDAS',
  STAND_CONGRESSO = 'STAND_CONGRESSO',
  TREINAMENTO = 'TREINAMENTO',
  JANTAR_PREMIACAO = 'JANTAR_PREMIACAO',
  CONFRATERNIZACAO = 'CONFRATERNIZACAO',
  LANCAMENTO = 'LANCAMENTO',
  EVENTO_RESIDENCIAL = 'EVENTO_RESIDENCIAL',
  CORPORATIVO_GERAL = 'CORPORATIVO_GERAL',
  MINI_MEETING = 'MINI_MEETING',
}
