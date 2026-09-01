/**
 * Domänen-Fehler mit HTTP-Status.
 * Der zentrale Error-Handler (app.ts) übersetzt diese in JSON-Responses.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 400 — ungültige Eingabe (z. B. fehlgeschlagene zod-Validierung). */
export class BadRequestError extends AppError {
  constructor(message = 'Ungültige Anfrage') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

/** 401 — nicht authentifiziert / Session ungültig. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Nicht authentifiziert') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/** 403 — nicht berechtigt. */
export class ForbiddenError extends AppError {
  constructor(message = 'Nicht berechtigt') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/** 404 — Ressource nicht gefunden. */
export class NotFoundError extends AppError {
  constructor(message = 'Nicht gefunden') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/** 409 — Konflikt (z. B. E-Mail bereits registriert). */
export class ConflictError extends AppError {
  constructor(message = 'Konflikt') {
    super(409, message);
    this.name = 'ConflictError';
  }
}
