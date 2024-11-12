<template>
  <div class="flex justify-content-start align-items-center">
    <div
      class="rounded-3xl mr-6 w-28 h-28 flex items-center justify-center overflow-hidden"
    >
      <img class="" src="@/assets/icon.svg" />
    </div>
    <div>
      <div class="flex items-center">
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="4" cy="4" r="4" fill="#00CD98" />
        </svg>
        <p class="ml-1 text-green-400 text-lg">Running</p>
      </div>
      <h3 class="text-4xl sm:text-5xl font-semibold  dark:text-white">ElectrumX</h3>
      <span class="text-sm text-gray-500 font-medium">{{
        version ? `v${version}` : "..."
      }}</span>
    </div>
  </div>
</template>

<script>
// import Vue from "vue";
import { mapState } from "vuex";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapState({
      version: (state) => state.electrumx.version,
    }),
  },
  created() {
    this.$store.dispatch("electrumx/getVersion");
  },
};
</script>
