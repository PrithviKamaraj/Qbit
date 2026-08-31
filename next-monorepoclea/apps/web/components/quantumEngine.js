// Complex math helper functions: { re, im }
export const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const cMul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });

const invSqrt2 = 1 / Math.SQRT2;

export const GATES_FIXED = {
  H: [
    [{ re: invSqrt2, im: 0 }, { re: invSqrt2, im: 0 }],
    [{ re: invSqrt2, im: 0 }, { re: -invSqrt2, im: 0 }]
  ],
  X: [
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
    [{ re: 1, im: 0 }, { re: 0, im: 0 }]
  ],
  Y: [
    [{ re: 0, im: 0 }, { re: 0, im: -1 }],
    [{ re: 0, im: 1 }, { re: 0, im: 0 }]
  ],
  Z: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: -1, im: 0 }]
  ],
  S: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 0, im: 1 }]
  ],
  T: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: invSqrt2, im: invSqrt2 }]
  ]
};

// Parameterized Rotation Gates (Any Angle theta in radians)
export const getRxMatrix = (theta = 0) => {
  const cosT2 = Math.cos(theta / 2);
  const sinT2 = Math.sin(theta / 2);
  return [
    [{ re: cosT2, im: 0 }, { re: 0, im: -sinT2 }],
    [{ re: 0, im: -sinT2 }, { re: cosT2, im: 0 }]
  ];
};

export const getRyMatrix = (theta = 0) => {
  const cosT2 = Math.cos(theta / 2);
  const sinT2 = Math.sin(theta / 2);
  return [
    [{ re: cosT2, im: 0 }, { re: -sinT2, im: 0 }],
    [{ re: sinT2, im: 0 }, { re: cosT2, im: 0 }]
  ];
};

export const getRzMatrix = (theta = 0) => {
  const cosT2 = Math.cos(theta / 2);
  const sinT2 = Math.sin(theta / 2);
  return [
    [{ re: cosT2, im: -sinT2 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: cosT2, im: sinT2 }]
  ];
};

export function simulateEnhanced(gateSequence) {
  let c0 = { re: 1, im: 0 }; // Start at |0>
  let c1 = { re: 0, im: 0 };

  for (const gate of gateSequence) {
    if (!gate) continue;

    let matrix;
    const theta = gate.theta ?? 0;

    if (gate.name === 'Rx') {
      matrix = getRxMatrix(theta);
    } else if (gate.name === 'Ry') {
      matrix = getRyMatrix(theta);
    } else if (gate.name === 'Rz') {
      matrix = getRzMatrix(theta);
    } else if (GATES_FIXED[gate.name]) {
      matrix = GATES_FIXED[gate.name];
    } else {
      continue;
    }

    const [row0, row1] = matrix;
    const nextC0 = cAdd(cMul(row0[0], c0), cMul(row0[1], c1));
    const nextC1 = cAdd(cMul(row1[0], c0), cMul(row1[1], c1));

    c0 = nextC0;
    c1 = nextC1;
  }

  return { c0, c1 };
}