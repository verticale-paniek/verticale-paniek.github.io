<template>
  <section v-if="session">
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ session.name }}
    </h1>
    <p class="mt-1 text-sm text-muted">
      {{ doneCount }} of {{ session.blocks.length }} done. Tick a block off when you are finished; tap an exercise to open its timer.
    </p>

    <p
      v-if="!session.blocks.length"
      class="my-6 text-muted"
      role="status"
    >
      This session is empty. Add blocks under Edit sessions.
    </p>

    <ol class="m-0 mt-4 list-none p-0">
      <li
        v-for="item in session.blocks"
        :key="item.key"
        class="mb-4 rounded-xl border border-outline/50 bg-surface"
      >
        <div class="flex items-center">
          <button
            class="grid size-12 shrink-0 place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-accent"
            :aria-label="`${item.title}: ${item.done ? 'done' : 'not done'}`"
            :aria-pressed="item.done"
            @click="toggleDone(item)"
          >
            <Icon
              :name="item.done ? 'lucide:circle-check' : 'lucide:circle'"
              :class="item.done ? 'text-accent' : 'text-muted'"
              size="24"
              aria-hidden="true"
            />
          </button>
          <div class="min-w-0 flex-1 py-3 pr-3">
            <span
              class="block text-sm font-medium"
              :class="item.done ? 'text-muted line-through' : ''"
            >{{ item.title }}</span>
            <span
              v-if="item.kind === 'circuit'"
              class="block text-xs text-muted"
            >{{ describeBlock(item) }}{{ item.chain ? ' · each one starts by itself' : '' }}</span>
          </div>
        </div>

        <div
          v-if="!item.done"
          class="px-3 pb-3"
        >
          <template v-if="item.kind === 'pick'">
            <p
              v-if="!item.choices.length && !item.note.trim()"
              class="text-sm text-muted"
            >
              Nothing chosen. Pick something under Edit sessions.
            </p>
            <ul
              v-if="item.choices.length"
              class="m-0 list-none p-0"
            >
              <li
                v-for="choice in item.choices"
                :key="choice"
                class="mb-2 rounded-xl border border-outline/50 bg-bg p-3 text-sm"
              >
                {{ choice }}
              </li>
            </ul>
            <p
              v-if="item.note.trim()"
              class="whitespace-pre-line text-sm text-muted"
            >
              {{ item.note }}
            </p>
          </template>

          <template v-else>
            <p
              v-if="!item.slots.length"
              class="text-sm text-muted"
            >
              The circuit is empty. Add exercises under Edit sessions.
            </p>
            <ol class="m-0 list-none p-0">
              <li
                v-for="(slot, index) in item.slots"
                :id="`slot-${slot.key}`"
                :key="slot.key"
                class="mb-2 rounded-xl border bg-bg"
                :class="open === slot.key ? 'border-accent' : 'border-outline/50'"
              >
                <button
                  class="flex min-h-14 w-full items-center gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-accent"
                  :aria-expanded="open === slot.key"
                  @click="toggle(slot.key)"
                >
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-text/5 text-sm font-semibold text-muted">{{ index + 1 }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium">{{ slot.option }}</span>
                    <span class="block text-xs text-muted">{{ familyTitle(slot.family) }} · {{ timerLabel(slot) }}</span>
                  </span>
                  <Icon
                    :name="open === slot.key ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                    class="text-muted"
                    aria-hidden="true"
                  />
                </button>
                <div
                  v-if="open === slot.key"
                  class="px-3 pb-3"
                >
                  <TimerPanel
                    v-if="timerOf(slot)"
                    :key="slot.key"
                    :timer="timerOf(slot)!"
                    :chain="chainOf(item, slot, index)"
                    @finished="onFinished(item, index)"
                  />
                  <p
                    v-else
                    class="rounded-xl border border-outline/50 bg-surface p-4 text-center text-sm text-muted"
                  >
                    Untimed. Do it at your own pace.
                  </p>
                </div>
              </li>
            </ol>
          </template>
        </div>
      </li>
    </ol>

    <button
      v-if="doneCount"
      class="min-h-11 px-2 text-sm text-muted underline focus-visible:outline-2 focus-visible:outline-accent"
      @click="clearTicks"
    >
      Clear ticks
    </button>
  </section>
</template>

<script setup lang="ts">
import TimerPanel, { type Chain } from '../components/TimerPanel.vue'
import { families, getProfile, getTimer, type Slot } from '../plan'
import { describeBlock, useSession, type Block } from '../useSession'

const { session, clearTicks } = useSession()

/** The slot whose timer is open; one at a time in the whole session, so only one timer runs. */
const open = ref<number | null>(null)
/** The slot a chain opened by itself; its timer starts without a tap. */
const autoKey = ref<number | null>(null)

const doneCount = computed(() => session.value?.blocks.filter(b => b.done).length ?? 0)

const familyTitle = (id: string) => families.find(f => f.id === id)?.title ?? id
const timerOf = (slot: Slot) => {
  const id = getProfile(slot.profileId)?.timer
  return id ? getTimer(id) : undefined
}
const timerLabel = (slot: Slot) => timerOf(slot)?.label ?? 'Untimed'

function chainOf(item: Block, slot: Slot, index: number): Chain | undefined {
  if (!item.chain) {
    return undefined
  }
  return {
    title: slot.option,
    position: `${index + 1} of ${item.slots.length}`,
    next: item.slots[index + 1]?.option ?? null,
    last: index === item.slots.length - 1,
    auto: autoKey.value === slot.key,
  }
}

function toggle(key: number) {
  autoKey.value = null
  open.value = open.value === key ? null : key
}

/** Ticking a block off folds it away, which also closes its timer. */
function toggleDone(item: Block) {
  item.done = !item.done
  if (item.done && item.slots.some(s => s.key === open.value)) {
    open.value = null
    autoKey.value = null
  }
}

/** In a chain, the next exercise opens and starts when one ends. */
function onFinished(item: Block, index: number) {
  const next = item.slots[index + 1]
  if (!item.chain || !next) {
    return
  }
  open.value = next.key
  autoKey.value = timerOf(next) ? next.key : null
  nextTick(() => document.getElementById(`slot-${next.key}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}
useHeaderBack('Back to sessions', '/training')
</script>
