import type { ProofStatus } from '../types/proof'

export const proofStatuses: ReadonlyArray<{ value: ProofStatus, label: string }> = [
  { value: 1, label: 'Entwurf' },
  { value: 2, label: 'In Prüfung' },
  { value: 3, label: 'Prüfung fehlgeschlagen' },
  { value: 4, label: 'Auswertung bereit' },
  { value: 5, label: 'Karte abgeschlossen' },
  { value: 6, label: 'Verworfen' },
]

export function formatProofDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Datum nicht verfügbar'
  return new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
