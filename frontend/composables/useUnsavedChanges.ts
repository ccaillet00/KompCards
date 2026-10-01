import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export function useUnsavedChanges(snapshot: () => string, ready: Ref<boolean>) {
  const baseline = ref<string | null>(null)
  const dirty = computed(() => ready.value && snapshot() !== baseline.value)
  function markSaved(): void { baseline.value = snapshot() }
  function beforeUnload(event: BeforeUnloadEvent): void {
    if (!dirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  onBeforeRouteLeave(() => !dirty.value || window.confirm('Du hast ungespeicherte Änderungen. Seite wirklich verlassen und Änderungen verwerfen?'))
  return { dirty, markSaved }
}
