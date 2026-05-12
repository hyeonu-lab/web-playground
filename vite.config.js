import { resolve } from "node:path";

export default {
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        seatChart: resolve(__dirname, "tools/seat-chart/index.html"),
        pinballDraw: resolve(__dirname, "tools/pinball-draw/index.html"),
      },
    },
  },
};
