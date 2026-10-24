export interface HeaderBack {
  label: string
  /** A path to navigate to, or a handler to run. */
  to: string | (() => void)
  /** The route the target belongs to; the layout ignores it on any other route. */
  path?: string
}

/** Lets a page put its "back" action in the shell's top bar (replacing the launcher arrow) instead of using page space. */
export function useHeaderBack(label: string, to: HeaderBack['to']) {
  const current = useState<HeaderBack | null>('header-back', () => null)
  const own: HeaderBack = { label, to, path: useRoute().path }
  current.value = own
  onBeforeUnmount(() => {
    if (current.value === own) {
      current.value = null
    }
  })
}
