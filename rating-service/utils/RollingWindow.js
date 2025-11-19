class RollingWindow {
  constructor(windowSizeMs = 60000) {
    this.windowSize = windowSizeMs;
    this.samples = [];
  }

  record(value) {
    const now = Date.now();
    this.samples.push({ value, time: now });

    // Keep only values within the window
    this.samples = this.samples.filter(s => now - s.time <= this.windowSize);
  }

  mean() {
    if (this.samples.length === 0) return 0;
    return (
      this.samples.reduce((sum, s) => sum + s.value, 0) /
      this.samples.length
    );
  }

  min() {
    if (!this.samples.length) return 0;
    return Math.min(...this.samples.map(s => s.value));
  }

  max() {
    if (!this.samples.length) return 0;
    return Math.max(...this.samples.map(s => s.value));
  }

  count() {
    return this.samples.length;
  }
}

module.exports = RollingWindow;
