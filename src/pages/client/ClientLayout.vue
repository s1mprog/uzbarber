<script setup lang="ts">
import ClientFooter from "@/pages/client/ClientFooter/ClientFooter.vue"
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ✅ запас снизу под футер (примерно 72px) -->
    <div class="pb-20">
      <router-view />
    </div>

    <ClientFooter />
  </div>
</template>