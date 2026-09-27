<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
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

async function perform(userId: string, action: () => Promise<void>, success: string): Promise<void> {
  activeUserId.value = userId
  notice.value = null
  try {
    await action()
    notice.value = success
  } catch {
    // Das Composable stellt die Fehlermeldung für die Oberfläche bereit.
  } finally {
    activeUserId.value = null
  }
}

function roleOf(user: AdminUser): 'admin' | 'user' {
  return user.role?.split(',').map(role => role.trim()).includes('admin') ? 'admin' : 'user'
}

async function changeRole(user: AdminUser, event: Event): Promise<void> {
  const role = (event.target as HTMLSelectElement).value as 'admin' | 'user'
  await perform(user.id, () => admin.setRole(user.id, role), `Rolle für ${user.name} aktualisiert.`)
}

async function changePassword(user: AdminUser): Promise<void> {
  const password = passwords[user.id] ?? ''
  if (password.length < 8) return
  await perform(user.id, () => admin.setPassword(user.id, password), `Passwort für ${user.name} gesetzt und Sitzungen widerrufen.`)
  passwords[user.id] = ''
}

onMounted(() => {
  admin.load().catch(() => undefined)
})
</script>

<template>
  <main class="page-shell py-12 xl:py-14">
    <header class="max-w-3xl">
      <p class="eyebrow">
        Administration
      </p>
      <h1 class="mt-4 font-display text-5xl font-bold leading-tight text-primary xl:text-6xl">
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

          <label class="form-control">
            <span class="label-text mb-2 font-medium">Rolle</span>
            <select
              class="select select-bordered w-full"
              :value="roleOf(user)"
              :disabled="activeUserId === user.id"
              @change="changeRole(user, $event)"
            >
              <option value="user">Benutzer</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

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
              :disabled="activeUserId === user.id || (passwords[user.id]?.length ?? 0) < 8"
            >
              Passwort setzen
            </UiButton>
          </form>

          <div class="flex flex-col gap-2">
            <UiButton
              variant="secondary"
              :disabled="activeUserId === user.id"
              @click="perform(user.id, () => admin.revokeSessions(user.id), `Sitzungen von ${user.name} widerrufen.`)"
            >
              Sitzungen widerrufen
            </UiButton>
            <UiButton
              :variant="user.banned ? 'secondary' : 'danger'"
              :disabled="activeUserId === user.id"
              @click="perform(user.id, () => admin.setBanned(user.id, !user.banned), user.banned ? `${user.name} entsperrt.` : `${user.name} gesperrt.`)"
            >
              {{ user.banned ? 'Entsperren' : 'Sperren' }}
            </UiButton>
          </div>
        </div>
      </UiSurfaceCard>
    </section>
  </main>
</template>
