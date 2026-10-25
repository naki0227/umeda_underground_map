/**
 * 端末の加速度から歩数を数える（窓をとった山の検出。Brajdic & Harle 2013 の方式を簡単にしたもの）。
 * 加速度の大きさから重力（約 9.8）を引き、なめらかにしてから、しきい値を上に越えた山を 1 歩とする。
 * 一度しきい値の下（戻りの値）まで下がらないと次の山を数えず、近すぎる山も数えない
 */
export interface StepDetectorOptions {
  /** 1 歩とみなす山の高さ（m/s²） */
  threshold?: number;
  /** 次の山を数えるために下がる値（m/s²） */
  reset?: number;
  /** 歩と歩の最短の間隔（ms）。速歩きでも 1 秒に 3 歩ほど */
  minIntervalMs?: number;
  /** なめらかにする強さ（0〜1。大きいほど今の値を重く見る） */
  smoothing?: number;
}

const GRAVITY = 9.81;

export class StepDetector {
  private smoothed = 0;
  private armed = true;
  private lastStepAt = -Infinity;
  private readonly threshold: number;
  private readonly reset: number;
  private readonly minIntervalMs: number;
  private readonly smoothing: number;

  constructor(options: StepDetectorOptions = {}) {
    this.threshold = options.threshold ?? 1.2;
    this.reset = options.reset ?? 0.3;
    this.minIntervalMs = options.minIntervalMs ?? 300;
    this.smoothing = options.smoothing ?? 0.35;
  }

  /** 加速度（重力込み）の 3 軸を入れる。1 歩と数えたら true */
  push(x: number, y: number, z: number, timestampMs: number): boolean {
    const magnitude = Math.hypot(x, y, z) - GRAVITY;
    this.smoothed += this.smoothing * (magnitude - this.smoothed);
    if (this.smoothed < this.reset) this.armed = true;
    if (
      this.armed &&
      this.smoothed > this.threshold &&
      timestampMs - this.lastStepAt >= this.minIntervalMs
    ) {
      this.armed = false;
      this.lastStepAt = timestampMs;
      return true;
    }
    return false;
  }
}

/** 歩幅（m）。案内の歩数のめやすと同じ */
export const STRIDE_M = 0.7;
