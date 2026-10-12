<template>
  <section>
    <h1 class="my-[0.67em] text-[2em] font-bold">
      Admin
    </h1>
    <h2 class="my-[0.83em] text-[1.5em] font-bold">
      Members
    </h2>
    <form
      class="grid max-w-96 gap-3"
      @submit.prevent="invite"
    >
      <Label class="grid gap-1 text-[0.9rem] text-muted">Invite by email <input
        v-model="inviteEmail"
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
        type="email"
        required
      ></Label>
      <button
        class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
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
      class="my-4 grid gap-2 rounded-xl bg-surface px-4 py-3"
    >
      <p class="m-0">
        <strong>{{ shared.kind === 'invite' ? 'Invite' : 'New sign-in link' }} for {{ shared.email }}</strong><br>
        <small class="text-[smaller] block text-muted">One-time link, send it only to this person. It expires after a while; create a new one if it stops working.</small>
      </p>
      <input
        class="rounded-lg border border-outline bg-surface px-3 py-2 text-text"
        :value="shared.link"
        readonly
        aria-label="Link"
        @focus="($event.target as HTMLInputElement).select()"
      >
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="rounded-lg bg-accent px-4 py-2 text-bg disabled:opacity-50"
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
          class="rounded-lg px-4 py-2 disabled:opacity-50 bg-transparent text-muted"
          @click="shared = null"
        >
          Done
        </button>
      </div>
    </div>

    <ul class="my-4 grid list-none gap-2 p-0">
      <li
        v-for="u in users"
        :key="u.id"
        class="grid gap-2 rounded-xl bg-surface px-4 py-3"
      >
        <div>
          <strong>{{ u.email }}</strong>
          <small class="text-[smaller] block text-muted">
            {{ u.role === 'admin' ? 'admin · ' : '' }}{{ u.banned ? 'disabled' : u.confirmed ? 'active' : 'invited' }}
          </small>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="rounded-lg px-4 py-2 disabled:opacity-50 bg-transparent text-muted"
            :disabled="busy"
            @click="newLink(u)"
          >
            New link
          </button>
          <template v-if="u.role !== 'admin'">
            <button
              class="rounded-lg px-4 py-2 disabled:opacity-50 bg-transparent text-muted"
              :disabled="busy"
              @click="toggleBan(u)"
            >
              {{ u.banned ? 'Enable' : 'Disable' }}
            </button>
            <AlertDialogRoot>
              <AlertDialogTrigger
                class="rounded-lg bg-[#d9534f] px-4 py-2 text-white disabled:opacity-50"
                :disabled="busy"
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogPortal>
                <AlertDialogOverlay class="fixed inset-0 bg-black/60" />
                <AlertDialogContent class="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-96 break-words -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-4 shadow-xl">
                  <AlertDialogTitle class="mt-0 text-xl">
                    Delete {{ u.email }}?
                  </AlertDialogTitle>
                  <AlertDialogDescription class="my-4">
                    This also removes their data. This cannot be undone.
                  </AlertDialogDescription>
                  <div class="flex justify-end gap-2">
                    <AlertDialogCancel class="rounded-lg bg-transparent px-4 py-2 text-muted">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      class="rounded-lg bg-[#d9534f] px-4 py-2 text-white"
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
