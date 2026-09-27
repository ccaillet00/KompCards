import { describe, expect, it } from 'vitest'
import { githubErrorMessage } from '../utils/oauthError'

describe('GitHub-Fehlermeldungen', () => {
  it.each([
    ['account_not_linked', 'Passwort'],
    ['signup_disabled', 'registriere'],
    ['access_denied', 'abgebrochen'],
    ['state_mismatch', 'erneut'],
    ['github_email_not_verified', 'bestätigte E-Mail-Adresse'],
    ['email_not_found', 'E-Mail-Adresse'],
    ['user_banned', 'gesperrt'],
  ])('übersetzt %s', (code, text) => {
    expect(githubErrorMessage(code)).toContain(text)
  })
  it('zeigt unbekannte Fehler niemals unverändert an', () => {
    expect(githubErrorMessage('<script>evil</script>')).not.toContain('evil')
    expect(githubErrorMessage(['access_denied'])).toContain('GitHub')
  })
})
