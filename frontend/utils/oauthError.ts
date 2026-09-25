/** Only display our own messages, never untrusted OAuth error descriptions. */
export function githubErrorMessage(code: unknown): string {
  switch (typeof code === 'string' ? code.toLowerCase() : '') {
    case 'account_not_linked':
      return 'Für diese E-Mail-Adresse besteht bereits ein Konto mit einer anderen Anmeldemethode. Nutze deine bisherige Anmeldung, zum Beispiel E-Mail und Passwort. Eine Verknüpfung mit GitHub ist nicht möglich.'
    case 'signup_disabled':
      return 'Es besteht noch kein KompCards-Konto für diesen GitHub-Zugang. Bitte registriere dich zuerst mit GitHub.'
    case 'access_denied':
      return 'Die Anmeldung mit GitHub wurde abgebrochen. Du kannst es erneut versuchen.'
    case 'github_email_not_verified':
    case 'email_not_verified':
      return 'Für GitHub benötigst du eine bestätigte E-Mail-Adresse. Bestätige sie bei GitHub und versuche es erneut.'
    case 'email_not_found':
      return 'GitHub hat keine E-Mail-Adresse bereitgestellt. Prüfe deine E-Mail-Einstellungen und die Freigabe bei GitHub.'
    case 'state_mismatch':
    case 'state_not_found':
    case 'state_invalid':
      return 'Die GitHub-Anmeldung ist abgelaufen oder ungültig. Bitte starte sie erneut.'
    case 'user_banned':
    case 'banned_user':
      return 'Dein Konto ist gesperrt. Bitte wende dich an den Support.'
    case 'provider_not_found':
      return 'Die Anmeldung mit GitHub ist derzeit nicht verfügbar.'
    default:
      return 'Die Anmeldung mit GitHub konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
  }
}
