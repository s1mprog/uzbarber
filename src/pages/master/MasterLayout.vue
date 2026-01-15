<script setup>
import MasterFooter from "./MasterFooter/MasterFooter.vue"
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="flex-1">
      <router-view />
    </div>

    <MasterFooter />
  </div>
</template>
