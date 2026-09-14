/**
 * Safe Thai Date / Timezone utilities
 * SQL Server in this stack stores Bangkok time (UTC+7).
 * When rendered, we format dates nicely in Thai locale (e.g. 14 ก.ย. 2569)
 */

export function formatThaiDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatThaiDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' น.';
}

export function formatTimeOnly(dateInput?: string | Date | null): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' น.';
}
