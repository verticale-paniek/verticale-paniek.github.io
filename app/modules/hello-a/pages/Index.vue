<script setup lang="ts">
const count = useState('hello-a-count', () => 0)
</script>

<template>
  <section>
    <h1>Hello A</h1>
    <p>Taps: {{ count }}</p>
    <button @click="count++">Tap</button>
  </section>
</template>
