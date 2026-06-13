// ---------------------------------------------------------------------------
// CNPJ branded type
// ---------------------------------------------------------------------------

/** CNPJ must NEVER be stored or passed as a number — always use this branded string type. */
export type Cnpj = string & { readonly _brand: 'Cnpj' };

/** Constant to document the invariant: CNPJ must always be a string. */
export const CNPJ_MUST_BE_STRING = true;

/**
 * Parse and validate a CNPJ value.
 * - Returns null if raw is a number (CNPJ must NEVER be a number)
 * - Returns null if not a string
 * - Strips formatting (dots, dashes, slashes)
 * - Returns null if not exactly 14 digits after stripping
 * - Returns a branded Cnpj string
 */
export function parseCnpj(raw: unknown): Cnpj | null {
  if (typeof raw === 'number') {
    // CNPJ cannot be a number — leading zeros would be lost
    return null;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  // Strip common CNPJ formatting characters
  const stripped = raw.replace(/[.\-/]/g, '');

  // Must be exactly 14 digits
  if (!/^\d{14}$/.test(stripped)) {
    return null;
  }

  return stripped as Cnpj;
}

/** Format a branded Cnpj as XX.XXX.XXX/XXXX-XX */
export function formatCnpj(cnpj: Cnpj): string {
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

// ---------------------------------------------------------------------------
// Business day utilities
// ---------------------------------------------------------------------------

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Add a number of business days to a date, skipping weekends.
 *
 * NOTE: Brazilian public holidays are NOT currently accounted for.
 * A holiday calendar should be integrated to skip national/regional holidays.
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;

  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      remaining--;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// IdempotencyKey branded type
// ---------------------------------------------------------------------------

export type IdempotencyKey = string & { readonly _brand: 'IdempotencyKey' };

/**
 * Create an idempotency key from a prefix and one or more parts.
 * Format: `${prefix}:${parts.join(':')}`
 */
export function createIdempotencyKey(prefix: string, ...parts: string[]): IdempotencyKey {
  return `${prefix}:${parts.join(':')}` as IdempotencyKey;
}
