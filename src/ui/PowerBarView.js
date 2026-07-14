export class PowerBarView {
  constructor(eventBus) {
    this.container = document.getElementById("power-bar-container");
    this.fill = document.getElementById("power-bar-fill");
    this.container.style.display = "none";

    eventBus.on("power:start", () => {
      this.container.style.display = "block";
    });
    eventBus.on("power:update", ({ normalized }) => {
      this.fill.style.height = `${normalized * 100}%`;
      this.fill.style.background =
        normalized > 0.75
          ? "#d32f2f"
          : normalized > 0.4
            ? "#f5a623"
            : "#4caf50";
    });
    eventBus.on("power:release", () => {
      this.container.style.display = "none";
    });
    eventBus.on("power:cancel", () => {
      this.container.style.display = "none";
    });
  }
}
