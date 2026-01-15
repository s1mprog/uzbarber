<script setup lang="ts">
import AdminFooter from "./AdminFooter/AdminFooter.vue"
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- ✅ запас снизу под футер (примерно 72px) -->
    <div class="pb-20">
      <router-view />
    </div>

    <AdminFooter />
  </div>
</template>
