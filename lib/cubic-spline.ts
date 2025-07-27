type Segment = {
  x0: number; // left knot
  a: number; // y-value at left knot
  b: number;
  c: number;
  d: number;
};

export class CubicSpline {
  private readonly segs: Segment[];

  constructor(xs: number[], ys: number[]) {
    const n = xs.length;
    if (n < 2 || n !== ys.length) {
      throw new Error("x and y arrays must have the same length ≥ 2");
    }

    const h: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; ++i) {
      h[i] = xs[i + 1] - xs[i];
      if (h[i] <= 0) throw new Error("x array must be strictly increasing");
    }

    /* ---- solve tridiagonal system for the c-coefficients ---- */
    const alpha: number[] = new Array(n - 1).fill(0);
    for (let i = 1; i < n - 1; ++i) {
      alpha[i] =
        (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
    }

    const l: number[] = new Array(n).fill(0);
    const mu: number[] = new Array(n).fill(0);
    const z: number[] = new Array(n).fill(0);

    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;

    for (let i = 1; i < n - 1; ++i) {
      l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
      mu[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    l[n - 1] = 1;
    z[n - 1] = 0;

    const c: number[] = new Array(n).fill(0);
    const b: number[] = new Array(n - 1).fill(0);
    const d: number[] = new Array(n - 1).fill(0);

    for (let j = n - 2; j >= 0; --j) {
      c[j] = z[j] - mu[j] * c[j + 1];
      b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
      d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    /* ---- store per-segment coefficients ---- */
    this.segs = new Array(n - 1);
    for (let i = 0; i < n - 1; ++i) {
      this.segs[i] = {
        x0: xs[i],
        a: ys[i],
        b: b[i],
        c: c[i],
        d: d[i],
      };
    }
  }

  /** Evaluate the spline at any x within the original range */
  public eval(x: number): number {
    const seg = this.findSegment(x);
    const dx = x - seg.x0;
    return seg.a + seg.b * dx + seg.c * dx * dx + seg.d * dx * dx * dx;
  }

  /* binary search for the segment that contains x */
  private findSegment(x: number): Segment {
    let lo = 0,
      hi = this.segs.length - 1;

    if (x < this.segs[0].x0 || x > this.segs[hi].x0) {
      throw new RangeError("x is outside the interpolation range");
    }
    /* special-case right end to avoid overflow in the loop below */
    if (x === this.segs[hi].x0) return this.segs[hi];

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (x < this.segs[mid].x0) {
        hi = mid - 1;
      } else if (x >= this.segs[mid + 1].x0) {
        lo = mid + 1;
      } else {
        return this.segs[mid];
      }
    }
    /* should never get here */
    throw new Error("segment search failed");
  }
}
