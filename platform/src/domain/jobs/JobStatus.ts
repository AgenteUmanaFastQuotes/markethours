export enum JobStatus {
  NOVO = 'NOVO',
  AGUARDANDO_LIBERACAO = 'AGUARDANDO_LIBERACAO',
  LIBERADO_FASTQUOTES = 'LIBERADO_FASTQUOTES',
  FASTQUOTES_GERADO = 'FASTQUOTES_GERADO',
  EM_COTACAO = 'EM_COTACAO',
  COTACAO_CONCLUIDA = 'COTACAO_CONCLUIDA',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

/** Pattern for valid Umana Job IDs, e.g. UJ-5-1715000000000 */
export const JOB_ID_PATTERN = /^UJ-\d+-\d+$/;

export function isValidJobId(id: string): boolean {
  return JOB_ID_PATTERN.test(id);
}

/** Extracts a Job ID matching UJ-\d+-\d+ from an email subject */
export function parseJobIdFromSubject(subject: string): string | null {
  const match = subject.match(/UJ-\d+-\d+/);
  return match?.[0] ?? null;
}

/** Returns true if the subject string contains the given jobId */
export function jobIdMustBeInSubject(subject: string, jobId: string): boolean {
  return subject.includes(jobId);
}
