<template>
  <div class="py-14">
    <electrumx-header></electrumx-header>
    <div class="flex justify-end mb-2">
      <h3 class="font-semibold mb-0 text-gray-800 dark:text-gray-200">
        <!-- Case 1: Bitcoin Node still syncing -->
        <span v-if="syncPercent === -1" class="animate-pulse">
          Waiting for Bitcoin Node to finish syncing...
        </span>
        <!-- Case 2: Normal sync progress -->
        <span v-else-if="syncPercent >= 0">
          <span>{{ syncPercent >= 99.99 ? 100 : Number(syncPercent).toFixed(0) }}%</span>
          <span class="align-self-end ml-1">Synchronized</span>
        </span>
        <!-- Case 3: Waiting for ElectrumX response -->
        <span v-else class="animate-pulse">
          Connecting to ElectrumX server...
        </span>
      </h3>
    </div>
    <progress-bar
      :percentage="progressBarPercentage"
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
    progressBarPercentage() {
      // Clamp the value between 0 and 100 so that -1 and -2 are not displayed as 100%
      return Math.max(0, Math.min(100, this.syncPercent));
    }
  },
  methods: {
    fetchData() {
      this.$store.dispatch("electrumx/getSyncPercent");
    }
  },
  created() {
    this.fetchData();
    this.$store.dispatch("electrumx/getSyncPercent");
    this.$store.dispatch("electrumx/getConnectionInformation");
    this.dataInterval = window.setInterval(this.fetchData, 10000);
  },
  beforeDestroy() {
    window.clearInterval(this.dataInterval);
  },
  components: {
    ConnectionInformation,
    electrumxHeader: Header,
    ProgressBar,
  },
};
</script>
