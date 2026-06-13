export enum RevalidationStatus {
  SEM_ENVIO = 'SEM_ENVIO',
  PENDENTE = 'PENDENTE',
  LEMBRETE_ENVIADO = 'LEMBRETE_ENVIADO',
  RESPONDIDO = 'RESPONDIDO',
  CANCELADO = 'CANCELADO',
}

export function canSendRevalidationEmail(status: RevalidationStatus): boolean {
  return status === RevalidationStatus.SEM_ENVIO || status === RevalidationStatus.PENDENTE;
}

export function canSendReminder(status: RevalidationStatus): boolean {
  return status === RevalidationStatus.PENDENTE;
}
