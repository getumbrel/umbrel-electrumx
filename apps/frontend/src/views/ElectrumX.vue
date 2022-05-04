<template>
  <div class="py-14">
    <electrumx-header></electrumx-header>
    <div class="flex justify-end mb-2">
      <h3 class="font-semibold mb-0 text-gray-800 dark:text-gray-200">
        <span v-if="syncPercent !== -1">
          <span> {{ syncPercent >= 99.99 ? 100 : syncPercent }}%</span>
          <span class="align-self-end ml-1">Synchronized</span>
        </span>
        <span
          class="loading-placeholder loading-placeholder-lg d-block"
          style="width: 6rem;"
          v-else
        ></span>
      </h3>
    </div>
    <progress-bar
      :percentage="syncPercent"
      colorClass="bg-green-400"
      class="h-2"
    ></progress-bar>
    <connection-information></connection-information>
  </div>
</template>

<script>
// import Vue from "vue";
import { mapState } from "vuex";

import ConnectionInformation from "@/components/ConnectionInformation";
import Header from "@/components/Header";
import ProgressBar from "@/components/Utility/ProgressBar";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapState({
      syncPercent: (state) => {
        return state.electrumx.syncPercent;
      },
    }),
  },
  methods: {},
  created() {
    this.$store.dispatch("electrumx/getSyncPercent");
    this.$store.dispatch("electrumx/getConnectionInformation");
  },
  beforeDestroy() {},
  components: {
    ConnectionInformation,
    electrumxHeader: Header,
    ProgressBar,
  },
};
</script>
