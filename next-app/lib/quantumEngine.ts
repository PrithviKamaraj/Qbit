export type Complex = { re: number; im: number };
export type GateName = "H" | "X" | "Y" | "Z" | "S" | "T";

const cAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

const invSqrt2 = 1 / Math.SQRT2;

type GateMatrix = [[Complex, Complex], [Complex, Complex]];

export const GATES: Record<GateName, GateMatrix> = {
  H: [
    [
      { re: invSqrt2, im: 0 },
      { re: invSqrt2, im: 0 },
    ],
    [
      { re: invSqrt2, im: 0 },
      { re: -invSqrt2, im: 0 },
    ],
  ],
  X: [
    [
      { re: 0, im: 0 },
      { re: 1, im: 0 },
    ],
    [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
    ],
  ],
  Y: [
    [
      { re: 0, im: 0 },
      { re: 0, im: -1 },
    ],
    [
      { re: 0, im: 1 },
      { re: 0, im: 0 },
    ],
  ],
  Z: [
    [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
    ],
    [
      { re: 0, im: 0 },
      { re: -1, im: 0 },
    ],
  ],
  S: [
    [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
    ],
    [
      { re: 0, im: 0 },
      { re: 0, im: 1 },
    ],
  ],
  T: [
    [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
    ],
    [
      { re: 0, im: 0 },
      { re: invSqrt2, im: invSqrt2 },
    ],
  ],
};

export const AVAILABLE_GATES: GateName[] = ["H", "X", "Y", "Z", "S", "T"];

export function isGateName(value: string): value is GateName {
  return value in GATES;
}

export function simulateSingleQubit(gateSequence: (GateName | null | undefined)[]) {
  let c0: Complex = { re: 1, im: 0 };
  let c1: Complex = { re: 0, im: 0 };

  for (const gateName of gateSequence) {
    if (!gateName || !GATES[gateName]) continue;
    const [row0, row1] = GATES[gateName];

    const nextC0 = cAdd(cMul(row0[0], c0), cMul(row0[1], c1));
    const nextC1 = cAdd(cMul(row1[0], c0), cMul(row1[1], c1));

    c0 = nextC0;
    c1 = nextC1;
  }

  return { c0, c1 };
}

export function amplitudesToProbabilities(c0: Complex, c1: Complex) {
  const p0 = (c0.re ** 2 + c0.im ** 2) * 100;
  const p1 = (c1.re ** 2 + c1.im ** 2) * 100;
  return { p0: Math.round(p0), p1: Math.round(p1) };
}
