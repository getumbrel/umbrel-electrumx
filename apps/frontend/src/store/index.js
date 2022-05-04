import Vue from "vue";
import Vuex from "vuex";

//Modules
import system from "./modules/system";
import electrumx from "./modules/electrumx";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    system,
    electrumx,
  },
});
