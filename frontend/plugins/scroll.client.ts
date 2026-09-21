// Scroll-Verhalten beim Seitenwechsel.
//
// Verhindert, dass die Scrollposition vor Ende der Page-Transition
// springt: erst wenn der Übergang abgeschlossen ist, wird nach oben
// gescrollt. Anchor-Links (#section) bleiben unberührt — bei einem
// Hash im Ziel-Routenpfad übernimmt der Browser das Anker-Scrolling.
export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute()

  nuxtApp.hook('page:transition:finish', () => {
    if (!import.meta.client) return

    // Anchor-Link: Browser-Verhalten nicht übersteuern.
    if (route.hash) return

    window.scrollTo(0, 0)
  })
})
