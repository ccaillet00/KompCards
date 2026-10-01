<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { definePageMeta, useSeoMeta } from '#imports'
import UiButton from '../components/ui/UiButton.vue'
import UiSurfaceCard from '../components/ui/UiSurfaceCard.vue'
import { useAdminUsers, type AdminUser } from '../composables/useAdminUsers'

definePageMeta({ middleware: ['service-only', 'auth', 'admin'] })
useSeoMeta({ title: 'Benutzerverwaltung – KompCards' })

const admin = useAdminUsers()
const passwords = reactive<Record<string, string>>({})
const activeUserId = ref<string | null>(null)
const notice = ref<string | null>(null)
const roles = reactive<Record<string, 'admin' | 'user'>>({})
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(admin.total.value / 100)))
const confirmation = ref<{ user: AdminUser, title: string, message: string, action: () => Promise<void>, success: string } | null>(null)
const confirmationDialog = ref<HTMLDialogElement | null>(null)

async function requestConfirmation(user: AdminUser, kind: 'ban' | 'sessions' | 'password'): Promise<void> {
  const banning = !user.banned
  confirmation.value = kind === 'sessions'
    ? { user, title: 'Sitzungen widerrufen?', message: 'Alle aktiven Sitzungen werden beendet. Die Person muss sich erneut anmelden.', action: () => admin.revokeSessions(user.id), success: `Sitzungen von ${user.name} widerrufen.` }
    : kind === 'password'
      ? { user, title: 'Passwort setzen?', message: 'Das bisherige Passwort wird ersetzt und alle Sitzungen werden beendet.', action: () => admin.setPassword(user.id, passwords[user.id] ?? ''), success: `Passwort für ${user.name} gesetzt und Sitzungen widerrufen.` }
      : { user, title: banning ? 'Zugang sperren?' : 'Zugang entsperren?', message: banning ? 'Die Person kann KompCards anschliessend nicht mehr nutzen.' : 'Die Person kann sich wieder anmelden.', action: () => admin.setBanned(user.id, banning), success: banning ? `${user.name} gesperrt.` : `${user.name} entsperrt.` }
  await nextTick()
  confirmationDialog.value?.showModal()
}
function cancelConfirmation(): void {
  if (activeUserId.value) return
  confirmationDialog.value?.close()
  confirmation.value = null
}
async function confirmAction(): Promise<void> {
  const pending = confirmation.value
  if (!pending || activeUserId.value) return
  const succeeded = await perform(pending.user.id, pending.action, pending.success)
  if (succeeded) {
    passwords[pending.user.id] = ''
    cancelConfirmation()
  }
}
async function loadPage(target: number): Promise<void> {
  try {
    await admin.load(target)
    page.value = target
  } catch {
    // Keep the current page on failure.
  }
}

async function perform(userId: string, action: () => Promise<void>, success: string): Promise<boolean> {
  activeUserId.value = userId
  notice.value = null
  try {
    await action()
    notice.value = success
    return true
  } catch {
    // Das Composable stellt die Fehlermeldung für die Oberfläche bereit.
    return false
  } finally {
    activeUserId.value = null
  }
}

function roleOf(user: AdminUser): 'admin' | 'user' {
  return user.role?.split(',').map(role => role.trim()).includes('admin') ? 'admin' : 'user'
}

async function changeRole(user: AdminUser): Promise<void> {
  const role = roles[user.id] ?? roleOf(user)
  if (role === roleOf(user)) return
  if (await perform(user.id, () => admin.setRole(user.id, role), `Rolle für ${user.name} aktualisiert.`)) delete roles[user.id]
}
async function changePassword(user: AdminUser): Promise<void> {
  if ((passwords[user.id]?.length ?? 0) < 8) return
  await requestConfirmation(user, 'password')
}

onMounted(() => {
  admin.load().catch(() => undefined)
})
</script>

<template>
  <div class="page-shell py-12 xl:py-14">
    <header class="max-w-3xl">
      <p class="eyebrow">
        Administration
      </p>
      <h1 class="mt-4 font-display text-4xl font-bold leading-tight text-primary xl:text-5xl">
        Benutzerverwaltung
      </h1>
      <p class="mt-3 text-xl leading-8 text-base-content/65">
        Rollen und Zugänge verwalten sowie aktive Sitzungen gezielt widerrufen.
      </p>
    </header>

    <div
      v-if="admin.error.value"
      role="alert"
      class="alert alert-error mt-8"
    >
      {{ admin.error.value }}
    </div>
    <div
      v-if="notice"
      role="status"
      class="alert alert-success mt-8"
    >
      {{ notice }}
    </div>

    <div
      v-if="admin.isLoading.value"
      class="mt-10 grid gap-4"
      aria-label="Benutzer werden geladen"
    >
      <div
        v-for="item in 3"
        :key="item"
        class="skeleton h-56 bg-base-300/60"
      />
    </div>

    <section
      v-else
      class="mt-10 space-y-4"
      aria-label="Benutzerkonten"
    >
      <p class="text-sm text-base-content/60">
        {{ admin.total.value }} Benutzerkonten
      </p>
      <UiSurfaceCard
        v-for="user in admin.users.value"
        :key="user.id"
        class="bg-base-100/95 p-6"
      >
        <div class="grid gap-6 xl:grid-cols-[minmax(15rem,1fr)_12rem_minmax(18rem,1fr)_auto] xl:items-end">
          <div class="min-w-0">
            <h2 class="truncate font-display text-2xl font-bold text-primary">
              {{ user.name }}
            </h2>
            <p class="truncate text-sm text-base-content/65">
              {{ user.email }}
            </p>
            <p class="mt-2 text-xs text-base-content/45">
              ID: {{ user.id }}
            </p>
            <span
              class="badge mt-3"
              :class="user.banned ? 'badge-error' : 'badge-success'"
            >
              {{ user.banned ? 'Gesperrt' : 'Aktiv' }}
            </span>
          </div>

          <div class="form-control gap-2">
            <label
              :for="`role-${user.id}`"
              class="label-text font-medium"
            >Rolle</label>
            <select
              :id="`role-${user.id}`"
              class="select select-bordered w-full"
              :value="roles[user.id] ?? roleOf(user)"
              :disabled="Boolean(activeUserId)"
              @change="roles[user.id] = ($event.target as HTMLSelectElement).value as 'admin' | 'user'"
            >
              <option value="user">
                Benutzer
              </option>
              <option value="admin">
                Administrator
              </option>
            </select>
            <UiButton
              data-test="save-role"
              variant="secondary"
              :disabled="Boolean(activeUserId) || !roles[user.id] || roles[user.id] === roleOf(user)"
              @click="changeRole(user)"
            >
              Rolle speichern
            </UiButton>
          </div>

          <form
            class="flex gap-2"
            @submit.prevent="changePassword(user)"
          >
            <label class="form-control min-w-0 flex-1">
              <span class="label-text mb-2 font-medium">Neues Passwort</span>
              <input
                v-model="passwords[user.id]"
                type="password"
                minlength="8"
                autocomplete="new-password"
                class="input input-bordered w-full"
                placeholder="Mindestens 8 Zeichen"
              >
            </label>
            <UiButton
              type="submit"
              variant="secondary"
              class="self-end"
              :disabled="Boolean(activeUserId) || (passwords[user.id]?.length ?? 0) < 8"
            >
              Passwort setzen
            </UiButton>
          </form>

          <div class="flex flex-col gap-2">
            <UiButton
              variant="secondary"
              :disabled="Boolean(activeUserId)"
              @click="requestConfirmation(user, 'sessions')"
            >
              Sitzungen widerrufen
            </UiButton>
            <UiButton
              :variant="user.banned ? 'secondary' : 'danger'"
              :disabled="Boolean(activeUserId)"
              data-test="toggle-ban"
              @click="requestConfirmation(user, 'ban')"
            >
              {{ user.banned ? 'Entsperren' : 'Sperren' }}
            </UiButton>
          </div>
        </div>
      </UiSurfaceCard>
      <nav
        v-if="pageCount > 1"
        class="mt-6 flex items-center justify-between gap-4"
        aria-label="Benutzerseiten"
      >
        <UiButton
          variant="secondary"
          :disabled="page === 1 || admin.isLoading.value"
          @click="loadPage(page - 1)"
        >
          Vorherige Seite
        </UiButton>
        <span role="status">Seite {{ page }} von {{ pageCount }}</span>
        <UiButton
          variant="secondary"
          :disabled="page >= pageCount || admin.isLoading.value"
          @click="loadPage(page + 1)"
        >
          Nächste Seite
        </UiButton>
      </nav>
    </section>
    <dialog
      ref="confirmationDialog"
      class="modal"
      aria-labelledby="admin-confirm-title"
      aria-describedby="admin-confirm-message"
      @cancel.prevent="cancelConfirmation"
    >
      <div
        v-if="confirmation"
        data-test="admin-confirmation"
        class="modal-box border border-primary/15 bg-base-100"
      >
        <h2
          id="admin-confirm-title"
          class="text-2xl"
        >
          {{ confirmation.title }}
        </h2>
        <p class="mt-3 font-semibold">
          {{ confirmation.user.name }} · {{ confirmation.user.email }}
        </p>
        <p
          id="admin-confirm-message"
          class="mt-3 leading-7"
        >
          {{ confirmation.message }}
        </p>
        <p
          v-if="admin.error.value"
          role="alert"
          class="mt-3 text-error"
        >
          {{ admin.error.value }}
        </p>
        <div class="modal-action">
          <UiButton
            variant="secondary"
            :disabled="Boolean(activeUserId)"
            autofocus
            @click="cancelConfirmation"
          >
            Abbrechen
          </UiButton>
          <UiButton
            data-test="confirm-admin-action"
            variant="danger"
            :disabled="Boolean(activeUserId)"
            @click="confirmAction"
          >
            {{ activeUserId ? 'Wird ausgeführt …' : 'Bestätigen' }}
          </UiButton>
        </div>
      </div>
    </dialog>
  </div>
</template>
