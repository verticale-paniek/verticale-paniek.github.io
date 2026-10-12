<template>
  <section>
    <h1 class="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
      Admin
    </h1>
    <h2 class="mb-4 mt-8 text-lg font-semibold tracking-tight">
      Members
    </h2>
    <form
      class="grid max-w-md gap-5 rounded-2xl border border-outline/50 bg-surface p-5 sm:p-6"
      @submit.prevent="invite"
    >
      <Label class="grid gap-2 text-sm font-medium text-text">Invite by email <input
        v-model="inviteEmail"
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        type="email"
        required
      ></Label>
      <button
        class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="busy"
      >
        Create invite link
      </button>
    </form>
    <p
      v-if="error"
      class="my-4 text-error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-if="info"
      class="my-4 text-muted"
    >
      {{ info }}
    </p>

    <div
      v-if="shared"
      class="my-6 grid gap-4 rounded-2xl border border-outline/50 bg-surface p-5"
    >
      <p class="m-0">
        <strong>{{ shared.kind === 'invite' ? 'Invite' : 'New sign-in link' }} for {{ shared.email }}</strong><br>
        <small class="text-[smaller] block text-muted">One-time link, send it only to this person. It expires after a while; create a new one if it stops working.</small>
      </p>
      <input
        class="min-w-0 rounded-xl border border-outline bg-bg px-3 py-2.5 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        :value="shared.link"
        readonly
        aria-label="Link"
        @focus="($event.target as HTMLInputElement).select()"
      >
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="min-h-11 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          @click="copy"
        >
          Copy
        </button>
        <a
          class="text-accent underline"
          :href="whatsappShareUrl(shared.link, shared.kind)"
          target="_blank"
          rel="noopener"
        >Share via WhatsApp</a>
        <button
          class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          @click="shared = null"
        >
          Done
        </button>
      </div>
    </div>

    <ul class="my-6 grid list-none gap-3 p-0">
      <li
        v-for="u in users"
        :key="u.id"
        class="grid gap-4 rounded-2xl border border-outline/50 bg-surface p-5 sm:flex sm:items-center sm:justify-between"
      >
        <div>
          <strong class="break-all text-sm font-semibold">{{ u.email }}</strong>
          <small class="text-[smaller] block text-muted">
            {{ u.role === 'admin' ? 'admin · ' : '' }}{{ u.banned ? 'disabled' : u.confirmed ? 'active' : 'invited' }}
          </small>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            :disabled="busy"
            @click="newLink(u)"
          >
            New link
          </button>
          <template v-if="u.role !== 'admin'">
            <button
              class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-text/5 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              :disabled="busy"
              @click="toggleBan(u)"
            >
              {{ u.banned ? 'Enable' : 'Disable' }}
            </button>
            <AlertDialogRoot>
              <AlertDialogTrigger
                class="min-h-11 rounded-xl bg-[#b42318] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-50"
                :disabled="busy"
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogPortal>
                <AlertDialogOverlay class="fixed inset-0 bg-black/60" />
                <AlertDialogContent class="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-96 break-words -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-outline/50 bg-surface p-6 shadow-xl">
                  <AlertDialogTitle class="mt-0 text-lg font-semibold tracking-tight">
                    Delete {{ u.email }}?
                  </AlertDialogTitle>
                  <AlertDialogDescription class="my-4">
                    This also removes their data. This cannot be undone.
                  </AlertDialogDescription>
                  <div class="flex justify-end gap-2">
                    <AlertDialogCancel class="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-muted hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-accent">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      class="min-h-11 rounded-xl bg-[#b42318] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                      @click="remove(u)"
                    >
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialogRoot>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { adminCall, whatsappShareUrl, type AdminUser } from '~/shell/admin'

const supabase = useSupabase()
const users = ref<AdminUser[]>([])
const inviteEmail = ref('')
const error = ref('')
const info = ref('')
const busy = ref(false)
const shared = ref<{ email: string, link: string, kind: 'invite' | 'link' } | null>(null)

async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    return await work()
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong.'
  }
  finally {
    busy.value = false
  }
}

const refresh = () => run(async () => {
  users.value = (await adminCall<{ users: AdminUser[] }>(supabase, { action: 'list' })).users
})

onMounted(refresh)

async function invite() {
  const email = inviteEmail.value.trim()
  const result = await run(() => adminCall<{ link: string }>(supabase, { action: 'invite', email }))
  if (result) {
    shared.value = { email, link: result.link, kind: 'invite' }
    inviteEmail.value = ''
    await refresh()
  }
}

async function newLink(u: AdminUser) {
  const result = await run(() => adminCall<{ link: string }>(supabase, { action: 'link', id: u.id }))
  if (result) {
    shared.value = { email: u.email ?? '', link: result.link, kind: 'link' }
  }
}

async function copy() {
  if (!shared.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(shared.value.link)
    info.value = 'Link copied.'
  }
  catch {
    info.value = 'Copy failed: select the link and copy it manually.'
  }
}

async function toggleBan(u: AdminUser) {
  await run(() => adminCall(supabase, { action: 'set-banned', id: u.id, banned: !u.banned }))
  await refresh()
}

async function remove(u: AdminUser) {
  await run(() => adminCall(supabase, { action: 'delete', id: u.id }))
  await refresh()
}
</script>
