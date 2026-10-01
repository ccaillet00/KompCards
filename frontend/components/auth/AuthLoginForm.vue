<script setup lang="ts">
import { computed, nextTick, onMounted, reactive } from 'vue'
import { navigateTo, useRoute } from '#imports'
import { useAuth } from '../../composables/useAuth'
import UiButton from '../ui/UiButton.vue'
import UiFormField from '../ui/UiFormField.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiInput from '../ui/UiInput.vue'
import AuthPasswordField from './AuthPasswordField.vue'
import AuthGithubButton from './AuthGithubButton.vue'

const route = useRoute()
const auth = useAuth()
onMounted(() => auth.loadAuthMethods())
const form = reactive({ email: '', password: '' })
const errors = reactive<{ email?: string, password?: string }>({})
const registered = computed(() => route.query.registered === '1')

function validate(): boolean {
  errors.email = /^\S+@\S+\.\S+$/.test(form.email) ? undefined : 'Bitte gib eine gültige E-Mail-Adresse ein.'
  errors.password = form.password ? undefined : 'Bitte gib dein Passwort ein.'
  return !errors.email && !errors.password
}

async function submit(): Promise<void> {
  if (!validate()) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  try {
    await auth.login({ ...form })
    await navigateTo('/dashboard')
  } catch {
    // Der Auth-Service stellt die serverseitige Fehlermeldung bereit.
  }
}
async function githubSignIn(): Promise<void> {
  try {
    await auth.signInWithGithub('login')
  } catch {
    // useAuth provides the translated error above the form.
  }
}
</script>

<template>
  <div>
    <div
      v-if="registered"
      role="status"
      class="alert mt-7 border border-success/20 bg-success/10 text-success"
    >
      <UiIcon
        name="badge-check"
        :size="20"
      />
      Dein Konto wurde erstellt. Du kannst dich jetzt einloggen.
    </div>
    <div
      v-if="auth.error.value"
      role="alert"
      class="alert mt-7 border border-error/20 bg-error/10 text-error"
    >
      {{ auth.error.value }}
    </div>

    <form
      class="mt-9 space-y-5"
      novalidate
      @submit.prevent="submit"
    >
      <UiFormField
        id="login-email"
        label="E-Mail"
        :error="errors.email"
      >
        <UiInput
          id="login-email"
          v-model="form.email"
          type="email"
          placeholder="deine@email.ch"
          name="email"
          autocomplete="email"
          :aria-invalid="Boolean(errors.email) || undefined"
          :aria-describedby="errors.email ? 'login-email-error' : undefined"
        />
      </UiFormField>

      <AuthPasswordField
        id="login-password"
        v-model="form.password"
        label="Passwort"
        placeholder="Dein Passwort"
        autocomplete="current-password"
        :error="errors.password"
      />

      <UiButton
        type="submit"
        size="lg"
        class="w-full"
        :disabled="auth.isLoading.value"
      >
        <span
          v-if="auth.isLoading.value"
          class="loading loading-spinner loading-sm"
        />
        {{ auth.isLoading.value ? 'Anmeldung läuft …' : 'Einloggen' }}
        <UiIcon
          v-if="!auth.isLoading.value"
          name="arrow-right"
          :size="20"
        />
      </UiButton>
    </form>

    <AuthGithubButton
      v-if="auth.githubEnabled.value"
      mode="login"
      :loading="auth.isLoading.value"
      :disabled="auth.isLoading.value"
      @click="githubSignIn"
    />

    <p class="mt-4 text-sm text-base-content/75">
      Probleme beim Zugang? <NuxtLink
        to="/information#contact"
        class="link text-primary"
      >
        Supportinformationen ansehen
      </NuxtLink>
    </p>
    <p class="mt-5 text-center text-sm text-base-content/70">
      Noch kein Konto?
      <NuxtLink
        to="/login?mode=register"
        class="font-semibold text-primary underline underline-offset-4"
      >
        Jetzt registrieren
      </NuxtLink>
    </p>
  </div>
</template>
