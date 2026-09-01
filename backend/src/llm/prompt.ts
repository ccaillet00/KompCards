import type { LlmRequest } from './types.js';

const SYSTEM_PROMPT = [
  'Du bist ein Assistent, der Kompetenzkarten für Studierende der Höheren Fachschule auswertet.',
  'Gegeben ist eine strukturierte Beschreibung eines Arbeitsergebnisses (Rolle, Was, Wie, Warum, Umgebung, ggf. Vorgaben der Dozentin/des Dozenten).',
  'Erstelle daraus eine klare, fachlich korrekte Ausformulierung des Arbeitsergebnisses (work_result).',
  'Bewerte die Qualität des Nutzeingangs auf einer Skala von 1 bis 4 (1=very bad, 2=bad, 3=good, 4=very good).',
  'Gib an, ob das Arbeitsergebnis mit dem Rahmenlehrplan/Curriculum überlappt (overlap_curriculum).',
  'Formuliere konkrete Verbesserungshinweise (note_improvment); wenn keine nötig sind, gib null zurück.',
  'Antworte ausschließlich mit dem geforderten strukturierten Objekt.',
].join('\n');

/**
 * Baut den Prompt für einen LLM-Call aus der strukturierten Eingabe.
 * Bei einem Retry wird das `userFeedback` zusätzlich berücksichtigt.
 */
export function buildPrompt(request: LlmRequest): string {
  const lines = [
    'Strukturierte Eingabe des Studierenden:',
    `- Rolle im Unternehmen/Praktikum: ${request.userRole}`,
    `- Was: ${request.what}`,
    `- Wie: ${request.how}`,
    `- Warum: ${request.why}`,
    `- Umgebung/Kontext: ${request.environment}`,
  ];

  if (request.subject) {
    lines.push(`- Vorgaben der Dozentin/des Dozenten: ${request.subject}`);
  }

  if (request.userFeedback) {
    lines.push('', 'Feedback des Studierenden zur erneuten Erzeugung (bitte berücksichtigen):');
    lines.push(request.userFeedback);
  }

  return lines.join('\n');
}

export { SYSTEM_PROMPT };
