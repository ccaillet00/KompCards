<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from '#imports'
import { useAuth } from '../../composables/useAuth'
import BrandLogo from '../brand/BrandLogo.vue'
import UiIcon from '../ui/UiIcon.vue'

const router = useRouter()
const { user, isLoading, logout } = useAuth()
const hydrated = ref(false)
const initials = computed(() => user.value?.name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part[0]?.toUpperCase())
  .join('') || 'KC')

async function signOut(): Promise<void> {
  await logout()
  await router.push('/login')
}

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <header class="relative z-50 border-b border-primary/10 bg-base-100/95 backdrop-blur">
    <div class="page-shell flex min-h-20 items-center justify-between gap-8">
      <BrandLogo />
      <nav
        class="flex items-center gap-8 text-sm font-medium"
        aria-label="App-Navigation"
      >
        <NuxtLink
          to="/dashboard"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/cards"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Meine Karten
        </NuxtLink>
        <NuxtLink
          to="/profile"
          class="border-b-2 border-transparent py-7 hover:text-primary"
          active-class="border-primary text-primary"
        >
          Profil
        </NuxtLink>
      </nav>
      <details
        v-if="hydrated"
        class="dropdown dropdown-end"
      >
        <summary
          class="btn btn-ghost gap-2"
          aria-label="Benutzermenü öffnen"
        >
          <span class="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{{ initials }}</span>
          <UiIcon
            name="chevron-down"
            :size="16"
          />
        </summary>
        <div class="menu dropdown-content z-30 mt-2 w-72 rounded-box border border-primary/10 bg-base-100 p-2 shadow-soft">
          <div
            v-if="user"
            class="border-b border-primary/10 px-3 py-3"
          >
            <p class="truncate font-semibold text-primary">
              {{ user.name }}
            </p>
            <p class="truncate text-sm text-base-content/55">
              {{ user.email }}
            </p>
          </div>
          <ul class="mt-1">
            <li>
              <NuxtLink to="/profile">
                <UiIcon
                  name="user-round"
                  :size="18"
                />
                Profil anzeigen
              </NuxtLink>
            </li>
            <li>
              <button
                type="button"
                :disabled="isLoading"
                @click="signOut"
              >
                <UiIcon
                  name="log-out"
                  :size="18"
                />
                {{ isLoading ? 'Wird abgemeldet …' : 'Abmelden' }}
              </button>
            </li>
          </ul>
        </div>
      </details>
      <div
        v-else
        class="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary"
        aria-hidden="true"
      >
        KC
      </div>
    </div>
  </header>
</template>
