<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { navigateTo } from '#imports'
import { useAuth } from '../../composables/useAuth'
import UiButton from '../ui/UiButton.vue'
import UiFormField from '../ui/UiFormField.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiInput from '../ui/UiInput.vue'
import AuthPasswordField from './AuthPasswordField.vue'
import AuthGithubButton from './AuthGithubButton.vue'

const auth = useAuth()
onMounted(() => auth.loadAuthMethods())
const form = reactive({ name: '', email: '', password: '' })
const acceptedTerms = ref(false)
const errors = reactive<{ name?: string, email?: string, password?: string, terms?: string }>({})

function validate(): boolean {
  errors.name = form.name.trim() ? undefined : 'Bitte gib deinen Namen ein.'
  errors.email = /^\S+@\S+\.\S+$/.test(form.email) ? undefined : 'Bitte gib eine gültige E-Mail-Adresse ein.'
  errors.password = form.password.length >= 8 ? undefined : 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  errors.terms = acceptedTerms.value ? undefined : 'Bitte bestätige die Nutzungsbedingungen und Datenschutzbestimmungen.'
  return !errors.name && !errors.email && !errors.password && !errors.terms
}

async function submit(): Promise<void> {
  if (!validate()) return
  try {
    await auth.register({ ...form, name: form.name.trim() })
    await navigateTo('/login?registered=1')
  } catch {
    // Der Auth-Service stellt die serverseitige Fehlermeldung bereit.
  }
}
async function githubSignIn(): Promise<void> {
  try {
    await auth.signInWithGithub('register')
  } catch {
    // useAuth provides the translated error above the form.
  }
}
</script>

<template>
  <div>
    <div
      v-if="auth.error.value"
      role="alert"
      class="alert mt-7 border border-error/20 bg-error/10 text-error"
    >
      {{ auth.error.value }}
    </div>

    <form
      class="mt-8 space-y-4"
      novalidate
      @submit.prevent="submit"
    >
      <UiFormField
        id="register-name"
        label="Name"
        :error="errors.name"
      >
        <UiInput
          id="register-name"
          v-model="form.name"
          placeholder="Dein vollständiger Name"
          name="name"
          autocomplete="name"
          :aria-invalid="Boolean(errors.name) || undefined"
        />
      </UiFormField>

      <UiFormField
        id="register-email"
        label="E-Mail"
        :error="errors.email"
      >
        <UiInput
          id="register-email"
          v-model="form.email"
          type="email"
          placeholder="deine@email.ch"
          name="email"
          autocomplete="email"
          :aria-invalid="Boolean(errors.email) || undefined"
        />
      </UiFormField>

      <AuthPasswordField
        id="register-password"
        v-model="form.password"
        label="Passwort"
        placeholder="Mindestens 8 Zeichen"
        autocomplete="new-password"
        :error="errors.password"
      />

      <div>
        <label class="flex cursor-pointer items-start gap-3 text-sm leading-6 text-base-content/75">
          <input
            v-model="acceptedTerms"
            type="checkbox"
            class="checkbox checkbox-primary checkbox-sm mt-0.5"
          >
          <span>Ich akzeptiere die Nutzungsbedingungen und Datenschutzbestimmungen.</span>
        </label>
        <p
          v-if="errors.terms"
          role="alert"
          class="mt-1.5 text-sm text-error"
        >
          {{ errors.terms }}
        </p>
      </div>

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
        {{ auth.isLoading.value ? 'Konto wird erstellt …' : 'Konto erstellen' }}
        <UiIcon
          v-if="!auth.isLoading.value"
          name="arrow-right"
          :size="20"
        />
      </UiButton>
    </form>

    <AuthGithubButton
      v-if="auth.githubEnabled.value"
      mode="register"
      :loading="auth.isLoading.value"
      :disabled="auth.isLoading.value || !acceptedTerms"
      @click="githubSignIn"
    />

    <p class="mt-7 text-center text-sm text-base-content/70">
      Du hast bereits ein Konto?
      <NuxtLink
        to="/login"
        class="font-semibold text-primary underline underline-offset-4"
      >
        Jetzt einloggen
      </NuxtLink>
    </p>
  </div>
</template>
