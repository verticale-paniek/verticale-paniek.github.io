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
  if (result) shared.value = { email: u.email ?? '', link: result.link, kind: 'link' }
}

async function copy() {
  if (!shared.value) return
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
  if (!confirm(`Delete ${u.email}? This also removes their data.`)) return
  await run(() => adminCall(supabase, { action: 'delete', id: u.id }))
  await refresh()
}
</script>

<template>
  <section>
    <h1>Admin</h1>
    <h2>Members</h2>
    <form @submit.prevent="invite">
      <label>Invite by email <input v-model="inviteEmail" type="email" required></label>
      <button :disabled="busy">Create invite link</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="info" class="notice">{{ info }}</p>

    <div v-if="shared" class="link-box">
      <p>
        <strong>{{ shared.kind === 'invite' ? 'Invite' : 'New sign-in link' }} for {{ shared.email }}</strong><br>
        <small>One-time link, send it only to this person. It expires after a while; create a new one if it stops working.</small>
      </p>
      <input :value="shared.link" readonly aria-label="Link" @focus="($event.target as HTMLInputElement).select()">
      <div class="actions">
        <button @click="copy">Copy</button>
        <a :href="whatsappShareUrl(shared.link, shared.kind)" target="_blank" rel="noopener">Share via WhatsApp</a>
        <button class="ghost" @click="shared = null">Done</button>
      </div>
    </div>

    <ul class="users">
      <li v-for="u in users" :key="u.id">
        <div>
          <strong>{{ u.email }}</strong>
          <small>
            {{ u.role === 'admin' ? 'admin · ' : '' }}{{ u.banned ? 'disabled' : u.confirmed ? 'active' : 'invited' }}
          </small>
        </div>
        <div class="actions">
          <button class="ghost" :disabled="busy" @click="newLink(u)">New link</button>
          <template v-if="u.role !== 'admin'">
            <button class="ghost" :disabled="busy" @click="toggleBan(u)">{{ u.banned ? 'Enable' : 'Disable' }}</button>
            <button class="danger" :disabled="busy" @click="remove(u)">Delete</button>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.users { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
.users li { display: grid; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 12px; background: var(--surface); }
.link-box { display: grid; gap: 0.5rem; padding: 0.75rem 1rem; margin: 1rem 0; border-radius: 12px; background: var(--surface); }
.link-box p { margin: 0; }
small { display: block; color: var(--muted); }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
</style>
