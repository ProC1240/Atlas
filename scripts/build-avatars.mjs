import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  TorusGeometry,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  Quaternion,
  Shape,
  ExtrudeGeometry,
  DoubleSide,
  Matrix4,
  Euler,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const output = fileURLToPath(new URL('../public/models/avatars/', import.meta.url));
const definitions = {
  zeus: {
    skin: '#dba274',
    hair: '#e8e4d8',
    cloth: '#f0e9d7',
    lining: '#c49432',
    metal: '#cba052',
    dark: '#8b662f',
    eye: '#638895',
    width: 0.6,
    head: [0.38, 0.49, 0.33],
    jaw: 0.93,
    nose: 0.105,
    brow: 0.048,
    beard: 'cloud',
    hairStyle: 'swept',
    legs: 0.225,
  },
  athena: {
    skin: '#c98b65',
    hair: '#3b201a',
    cloth: '#17624f',
    lining: '#ebe1c7',
    metal: '#b38b47',
    dark: '#71532d',
    eye: '#96734a',
    width: 0.41,
    head: [0.29, 0.445, 0.285],
    jaw: 0.69,
    nose: 0.07,
    brow: 0.024,
    beard: null,
    hairStyle: 'braid',
    legs: 0.155,
  },
  hermes: {
    skin: '#e4ad7a',
    hair: '#a34b21',
    cloth: '#e98a25',
    lining: '#eee1be',
    metal: '#d3a34f',
    dark: '#775032',
    eye: '#738953',
    width: 0.405,
    head: [0.3, 0.43, 0.29],
    jaw: 0.65,
    nose: 0.072,
    brow: 0.027,
    beard: null,
    hairStyle: 'curls',
    legs: 0.155,
  },
  poseidon: {
    skin: '#bd855f',
    hair: '#20394d',
    cloth: '#227fa6',
    lining: '#91d4cc',
    metal: '#b3c8ca',
    dark: '#507b86',
    eye: '#5dd2cd',
    width: 0.51,
    head: [0.32, 0.51, 0.31],
    jaw: 0.78,
    nose: 0.105,
    brow: 0.036,
    beard: 'wave',
    hairStyle: 'long',
    legs: 0.19,
  },
  ares: {
    skin: '#b77c57',
    hair: '#282322',
    cloth: '#981e32',
    lining: '#b63f35',
    metal: '#42494c',
    dark: '#b48b4a',
    eye: '#684730',
    width: 0.59,
    head: [0.375, 0.445, 0.325],
    jaw: 1.03,
    nose: 0.1,
    brow: 0.05,
    beard: 'short',
    hairStyle: 'crop',
    legs: 0.225,
  },
};

function makeSculpture(id, d) {
  const groups = new Map();
  const skinForms = { Body: [], Head: [] };
  const material = (name, color, metalness = 0, roughness = 0.68) => {
    const value = new MeshStandardMaterial({ color, metalness, roughness, side: DoubleSide });
    value.name = name;
    return value;
  };
  const m = {
    skin: material('Skin', d.skin, 0, 0.72),
    hair: material('Hair', d.hair, 0, 0.78),
    hairLight: material('Hair highlights', d.hair, 0, 0.53),
    cloth: material('Signature cloth', d.cloth, 0, 0.92),
    lining: material('Linen', d.lining, 0, 0.92),
    metal: material('Metal', d.metal, 0.64, 0.33),
    dark: material('Engraved metal', d.dark, 0.52, 0.47),
    leather: material('Leather', '#56372a', 0, 0.88),
    white: material('Eye whites', '#ede6cf', 0, 0.39),
    iris: material('Iris', d.eye, 0.05, 0.34),
    pupil: material('Pupil', '#171b20', 0, 0.28),
    lip: material('Lip', id === 'athena' ? '#a55d4f' : '#965b43', 0, 0.75),
    stone: material('Basalt', '#303c39', 0.05, 0.93),
  };
  const add = (
    geometry,
    mat,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    part = 'Body',
  ) => {
    const mesh = new Mesh(geometry, mat);
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    mesh.rotation.fromArray(rotation);
    mesh.updateMatrix();
    geometry.applyMatrix4(mesh.matrix);
    geometry.deleteAttribute('uv');
    if (!geometry.index)
      geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
    const key = `${part}:${mat.name}`;
    if (!groups.has(key)) groups.set(key, { part, mat, shapes: [] });
    groups.get(key).shapes.push(geometry);
  };
  const ellipsoid = (p, s, mat, r = [0, 0, 0], part = 'Body') => {
    if (mat === m.skin) {
      skinForms[part].push({ p, s, r });
      return;
    }
    add(new SphereGeometry(1, 18, 12), mat, p, s, r, part);
  };
  const cylinder = (p, top, bottom, height, mat, r = [0, 0, 0], part) =>
    add(new CylinderGeometry(top, bottom, height, 32), mat, p, [1, 1, 1], r, part);
  const tube = (points, radius, mat, part = 'Body', segments = 22) =>
    add(
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        segments,
        radius,
        7,
        false,
      ),
      mat,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      part,
    );
  const ring = (p, radius, thickness, mat, r = [Math.PI / 2, 0, 0], scale = [1, 1, 1], part) =>
    add(new TorusGeometry(radius, thickness, 8, 48), mat, p, scale, r, part);
  const limb = (a, b, width, depth, mat) => {
    const start = new Vector3(...a),
      end = new Vector3(...b);
    const center = start.clone().add(end).multiplyScalar(0.5);
    if (mat === m.skin) {
      const rotation = new Euler().setFromQuaternion(
        new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          end.clone().sub(start).normalize(),
        ),
      );
      skinForms.Body.push({
        p: center.toArray(),
        s: [width, start.distanceTo(end) * 0.65, depth],
        r: [rotation.x, rotation.y, rotation.z],
      });
      return;
    }
    const geometry = new SphereGeometry(1, 18, 12);
    geometry.scale(width, start.distanceTo(end) * 0.61, depth);
    geometry.applyQuaternion(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), end.sub(start).normalize()),
    );
    add(geometry, mat, center.toArray());
  };
  const plate = (points, depth, mat, p, scale = [1, 1, 1], r = [0, 0, 0], part) => {
    const s = new Shape();
    s.moveTo(...points[0]);
    points.slice(1).forEach((point) => s.lineTo(...point));
    s.closePath();
    add(
      new ExtrudeGeometry(s, {
        depth,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.009,
        bevelSegments: 2,
        steps: 1,
      }),
      mat,
      p,
      scale,
      r,
      part,
    );
  };
  const surface = (nu, nv, point, mat, part = 'Body') => {
    const positions = [],
      indices = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) positions.push(...point(i / nu, j / nv));
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i,
          b = a + 1,
          c = a + nu + 1;
        indices.push(a, c, b, b, c, c + 1);
      }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    add(g, mat, [0, 0, 0], [1, 1, 1], [0, 0, 0], part);
  };
  const w = d.width,
    athletic = id === 'hermes',
    warrior = id === 'athena' || id === 'ares';
  const hy = id === 'poseidon' ? 3.02 : id === 'athena' ? 2.99 : athletic ? 2.95 : 2.99;
  const [hw, hh, hd] = d.head;
  cylinder([0, 0.015, 0], 0.83, 0.9, 0.12, m.stone);
  cylinder([0, 0.075, 0], 0.83, 0.83, 0.045, m.dark);
  cylinder([0, 0.103, 0], 0.8, 0.83, 0.025, m.stone);
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16;
    ellipsoid([Math.cos(a) * 0.851, 0.025, Math.sin(a) * 0.851], [0.014, 0.028, 0.014], m.dark);
  }

  for (const side of [-1, 1]) {
    const footX = side * (athletic ? 0.22 : 0.265),
      kneeX = side * (athletic ? 0.21 : 0.28);
    const shift = athletic && side === 1 ? -0.1 : 0;
    limb([side * 0.21, 1.48, 0], [kneeX, 0.92, shift], d.legs, d.legs * 0.88, m.skin);
    ellipsoid([kneeX, 0.88, shift + 0.022], [d.legs * 0.73, 0.125, 0.13], m.skin);
    limb([kneeX, 0.83, shift], [footX, 0.29, 0.035], d.legs * 0.7, d.legs * 0.72, m.skin);
    ellipsoid([footX, 0.205, 0.155], [d.legs * 0.69, 0.09, 0.245], m.skin);
    ellipsoid([footX, 0.151, 0.16], [d.legs * 0.77, 0.038, 0.265], m.leather);
    for (const z of [0.1, 0.23])
      tube(
        [
          [footX - d.legs * 0.67, 0.206, z],
          [footX, 0.292, z],
          [footX + d.legs * 0.67, 0.206, z],
        ],
        0.026,
        m.leather,
      );
    for (const y of [0.35, 0.48])
      ring([footX, y, 0.025], d.legs * 0.59, 0.018, m.leather, [Math.PI / 2, 0, 0], [1, 1, 0.8]);
    if (!athletic) {
      surface(
        20,
        12,
        (u, v) => {
          const a = (u - 0.5) * 2.2;
          const radius = 0.135 + Math.sin(v * Math.PI) * 0.025;
          return [footX + Math.sin(a) * radius, 0.32 + v * 0.4, 0.04 + Math.cos(a) * radius];
        },
        warrior ? m.metal : m.dark,
      );
      tube(
        [
          [footX, 0.34, 0.19],
          [footX, 0.54, 0.205],
          [footX, 0.71, 0.18],
        ],
        0.012,
        m.dark,
      );
    }
    if (athletic) {
      for (let k = 0; k < 4; k++)
        ellipsoid(
          [footX + side * (0.15 + k * 0.035), 0.36 + k * 0.045, -0.03 - k * 0.065],
          [0.028, 0.045, 0.135],
          m.metal,
          [0, side * 0.2, -side * 0.5],
        );
    }
  }

  surface(
    56,
    24,
    (u, v) => {
      const a = u * Math.PI * 2;
      const y = 1.49 + v * 0.96;
      const breadth = w * (0.61 + 0.39 * Math.sin(v * Math.PI * 0.66));
      const radiusZ = 0.245 + 0.055 * Math.sin(v * Math.PI);
      const front = Math.cos(a);
      return [
        Math.sin(a) * breadth,
        y,
        front * radiusZ + (front > 0 ? 0.026 * Math.sin(v * Math.PI * 3) : 0),
      ];
    },
    id === 'ares' ? m.metal : athletic ? m.cloth : m.skin,
  );
  const chestZ = 0.21;
  if (id === 'zeus' || id === 'poseidon') {
    for (const side of [-1, 1]) {
      ellipsoid(
        [side * w * 0.44, 2.28, chestZ],
        [w * 0.47, 0.19, 0.12],
        id === 'ares' ? m.metal : m.skin,
        [0, side * 0.12, side * 0.08],
      );
      for (let i = 0; i < 3; i++)
        ellipsoid(
          [side * 0.092, 2.02 - i * 0.135, 0.258],
          [0.088, 0.066, 0.035],
          id === 'ares' ? m.metal : m.skin,
        );
    }
  }
  ellipsoid([0, 2.57, 0], [hw * 0.6, 0.25, hw * 0.61], m.skin);
  ellipsoid([0, 2.09, -0.02], [w * 0.93, 0.47, 0.27], m.skin);
  for (const side of [-1, 1]) {
    limb([side * 0.08, 2.59, -0.02], [side * w * 0.81, 2.4, 0], 0.115, 0.14, m.skin);
    const shoulder = [side * (w + 0.055), 2.32, 0];
    const elbow = [side * (w + 0.17), 1.98, 0.015];
    const hand = [side * (w + 0.21), 1.7, 0.16];
    ellipsoid(
      shoulder,
      [athletic ? 0.135 : warrior && id === 'athena' ? 0.14 : 0.19, 0.205, 0.18],
      m.skin,
    );
    limb(shoulder, elbow, athletic ? 0.114 : id === 'athena' ? 0.11 : 0.166, 0.137, m.skin);
    limb(elbow, hand, athletic ? 0.1 : id === 'athena' ? 0.09 : 0.137, 0.12, m.skin);
    cylinder([hand[0], 1.83, 0.09], 0.115, 0.103, 0.19, m.metal, [0.2, 0, -side * 0.1]);
    ring([hand[0], 1.915, 0.071], 0.116, 0.015, m.dark, [Math.PI / 2 + 0.2, 0, 0]);
    ellipsoid(hand, [0.103, 0.135, 0.09], m.skin, [0.1, 0, side * 0.1]);
    for (let i = 0; i < 4; i++)
      ellipsoid(
        [hand[0] + (i - 1.5) * 0.039, 1.64, 0.235],
        [0.027, 0.069, 0.027],
        m.skin,
        [0.45, 0, 0],
      );
    ellipsoid([hand[0] - side * 0.079, 1.727, 0.23], [0.038, 0.073, 0.045], m.skin, [
      0,
      0,
      -side * 0.6,
    ]);
  }

  const skirtBottom = athletic || id === 'ares' ? 0.99 : id === 'athena' ? 0.42 : 0.54;
  surface(
    64,
    24,
    (u, v) => {
      const a = u * Math.PI * 2;
      const radius = w * 0.72 + 0.11 + (1 - v) * 0.17;
      const fold = (0.018 + 0.019 * (1 - v)) * Math.cos(a * (id === 'athena' ? 16 : 12) + v * 0.9);
      const cut = 0.1 * Math.sin(a + 1) * (1 - v);
      return [
        Math.sin(a) * (radius + fold),
        skirtBottom + v * (1.68 - skirtBottom) + cut,
        Math.cos(a) * (0.29 + (1 - v) * 0.13 + fold),
      ];
    },
    id === 'zeus' ? m.cloth : id === 'poseidon' ? m.cloth : id === 'athena' ? m.lining : m.cloth,
  );
  surface(
    64,
    2,
    (u, v) => {
      const a = u * Math.PI * 2;
      const fold = 0.037 * Math.cos(a * (id === 'athena' ? 16 : 12));
      return [
        Math.sin(a) * (w * 0.72 + 0.28 + fold),
        skirtBottom + 0.1 * Math.sin(a + 1) + v * 0.035,
        Math.cos(a) * (0.425 + fold),
      ];
    },
    m.metal,
  );
  if (id === 'ares')
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      plate(
        [
          [-0.08, 0],
          [0.08, 0],
          [0.071, -0.43],
          [0, -0.48],
          [-0.071, -0.43],
        ],
        0.02,
        m.leather,
        [Math.sin(a) * 0.48, 1.65, Math.cos(a) * 0.32],
        [1, 1, 1],
        [0, a, 0],
      );
      ellipsoid([Math.sin(a) * 0.495, 1.25, Math.cos(a) * 0.345], [0.024, 0.024, 0.024], m.dark);
    }

  surface(
    32,
    24,
    (u, v) => {
      const x = (u - 0.5) * (w * 1.5 + v * 0.55);
      return [
        x + 0.08 * Math.sin(v * 3),
        2.44 - v * (athletic ? 1.2 : 1.9),
        -0.2 - v * 0.15 + 0.045 * Math.cos(u * Math.PI * 12) * (v + 0.3),
      ];
    },
    id === 'zeus' ? m.lining : m.cloth,
    'Cape',
  );
  if (id === 'zeus' || id === 'poseidon' || id === 'athena') {
    surface(
      24,
      32,
      (u, v) => {
        const x = w * 0.81 * (1 - v) - w * 0.66 * v + (u - 0.5) * 0.36;
        const y = 2.52 - v * 0.9;
        const z = 0.345 + 0.06 * Math.sin(v * Math.PI) + 0.018 * Math.sin(u * Math.PI * 8 + v * 3);
        return [x, y, z];
      },
      m.cloth,
    );
    for (const edge of [-0.18, 0.18])
      tube(
        [
          [w * 0.81 + edge, 2.52, 0.272],
          [0.08 + edge, 2.09, 0.335],
          [-w * 0.66 + edge, 1.62, 0.284],
        ],
        0.012,
        m.metal,
      );
    ellipsoid([w * 0.8, 2.47, 0.29], [0.1, 0.1, 0.025], m.metal);
    ring([w * 0.8, 2.47, 0.312], 0.072, 0.011, m.dark, [0, 0, 0]);
  }
  if (id === 'athena') {
    surface(
      40,
      16,
      (u, v) => {
        const a = (u - 0.5) * Math.PI * 1.48;
        return [
          Math.sin(a) * (0.3 + v * 0.085),
          1.69 + v * 0.65,
          Math.cos(a) * (0.27 + 0.02 * Math.sin(v * Math.PI)),
        ];
      },
      m.metal,
    );
    for (const side of [-1, 1])
      tube(
        [
          [side * 0.04, 1.75, 0.29],
          [side * 0.13, 1.96, 0.3],
          [side * 0.25, 2.18, 0.25],
        ],
        0.013,
        m.dark,
      );
  }
  surface(
    48,
    2,
    (u, v) => {
      const a = u * 2 * Math.PI;
      return [Math.sin(a) * (w * 0.71 + 0.01), 1.61 + v * 0.11, Math.cos(a) * 0.314];
    },
    m.leather,
  );
  ellipsoid([0, 1.67, 0.327], [0.116, 0.09, 0.024], m.metal);
  ring([0, 1.67, 0.351], 0.063, 0.013, m.dark, [0, 0, 0]);
  if (athletic) {
    tube(
      [
        [-0.31, 2.47, 0.16],
        [-0.05, 2.06, 0.34],
        [0.31, 1.66, 0.3],
      ],
      0.033,
      m.leather,
    );
    ellipsoid([0.32, 1.46, 0.32], [0.135, 0.16, 0.08], m.leather);
    ellipsoid([0.32, 1.55, 0.37], [0.14, 0.055, 0.05], m.dark);
  }

  ellipsoid([0, hy + 0.025, -0.012], [hw, hh, hd], m.skin, [0, 0, 0], 'Head');
  ellipsoid(
    [0, hy - hh * 0.62, 0.075],
    [hw * d.jaw * 0.78, hh * 0.24, hd * 0.69],
    m.skin,
    [0, 0, 0],
    'Head',
  );
  for (const side of [-1, 1]) {
    ellipsoid(
      [side * hw * 0.965, hy - 0.015, -0.003],
      [0.061, 0.107, 0.061],
      m.skin,
      [0, 0, -side * 0.12],
      'Head',
    );
    ellipsoid([side * hw, hy - 0.017, 0.048], [0.027, 0.061, 0.019], m.lip, [0, 0, 0], 'Head');
    const ex = side * hw * 0.435,
      ey = hy + 0.075,
      ez = hd * 0.887;
    ellipsoid(
      [ex, ey, ez],
      [hw * 0.23, 0.046, 0.04],
      m.white,
      [0, side * 0.14, side * 0.06],
      'Head',
    );
    ellipsoid([ex, ey, ez + 0.035], [0.028, 0.032, 0.012], m.iris, [0, 0, 0], 'Head');
    ellipsoid([ex, ey, ez + 0.045], [0.012, 0.021, 0.006], m.pupil, [0, 0, 0], 'Head');
    ellipsoid(
      [ex - 0.007, ey + 0.012, ez + 0.051],
      [0.0055, 0.007, 0.003],
      m.white,
      [0, 0, 0],
      'Head',
    );
    tube(
      [
        [ex - side * hw * 0.23, ey - 0.004, ez - 0.002],
        [ex, ey + 0.046, ez + 0.028],
        [ex + side * hw * 0.23, ey + 0.005, ez - 0.009],
      ],
      0.014,
      m.skin,
      'Head',
      14,
    );
    tube(
      [
        [ex - side * hw * 0.21, ey - 0.006, ez],
        [ex, ey - 0.043, ez + 0.026],
        [ex + side * hw * 0.22, ey + 0.003, ez - 0.009],
      ],
      0.01,
      m.skin,
      'Head',
      14,
    );
    const tilt = id === 'ares' ? -0.033 : athletic ? side * 0.014 : 0.013;
    tube(
      [
        [side * hw * 0.15, hy + 0.15, hd * 0.925],
        [side * hw * 0.43, hy + 0.172 + tilt, hd * 0.84],
        [side * hw * 0.72, hy + 0.145 + tilt, hd * 0.64],
      ],
      d.brow,
      m.hair,
      'Head',
      16,
    );
  }
  ellipsoid([0, hy + 0.01, hd * 0.94], [d.nose * 0.49, 0.118, 0.065], m.skin, [0, 0, 0], 'Head');
  ellipsoid([0, hy - 0.057, hd + 0.065], [d.nose * 0.67, 0.054, 0.065], m.skin, [0, 0, 0], 'Head');
  for (const side of [-1, 1]) {
    ellipsoid(
      [side * d.nose * 0.57, hy - 0.075, hd + 0.028],
      [0.033, 0.027, 0.033],
      m.skin,
      [0, 0, 0],
      'Head',
    );
    ellipsoid(
      [side * d.nose * 0.51, hy - 0.09, hd + 0.045],
      [0.012, 0.009, 0.013],
      m.lip,
      [0, 0, 0],
      'Head',
    );
  }
  const mouthZ = hd * 0.91;
  tube(
    [
      [-hw * 0.29, hy - 0.164, mouthZ - 0.01],
      [-hw * 0.1, hy - 0.157, mouthZ + 0.013],
      [0, hy - 0.163, mouthZ + 0.017],
      [hw * 0.13, hy - 0.158, mouthZ + 0.012],
      [hw * 0.29, hy - (athletic ? 0.142 : 0.164), mouthZ - 0.01],
    ],
    0.01,
    m.lip,
    'Head',
    20,
  );
  ellipsoid([0, hy - 0.18, mouthZ + 0.012], [hw * 0.23, 0.018, 0.019], m.lip, [0, 0, 0], 'Head');

  surface(
    48,
    18,
    (u, v) => {
      const a = u * Math.PI * 2;
      const t = v * (Math.cos(a) > 0.1 ? 1.12 : 1.85);
      return [
        Math.sin(t) * Math.sin(a) * (hw + 0.034),
        hy + Math.cos(t) * (hh + 0.036),
        Math.sin(t) * Math.cos(a) * (hd + 0.024),
      ];
    },
    m.hair,
    'Head',
  );
  const hairLocks = id === 'hermes' ? 18 : id === 'zeus' ? 22 : 16;
  for (let i = 0; i < hairLocks; i++) {
    const a = (i * Math.PI * 2) / hairLocks;
    const x = Math.sin(a) * hw * 0.86,
      z = Math.cos(a) * hd * 0.83;
    const back = Math.cos(a) < 0.2;
    const bottom = d.hairStyle === 'long' && back ? hy - 0.4 : hy + 0.1;
    if (d.hairStyle === 'crop') {
      ellipsoid([x, hy + hh * 0.61, z], [0.073, 0.103, 0.077], m.hair, [0.15, a, 0.24], 'Head');
    } else if (d.hairStyle === 'curls' || d.hairStyle === 'swept') {
      tube(
        [
          [x * 0.25, hy + hh + 0.025, z * 0.3],
          [x * 0.8, hy + hh * 0.94, z * 0.8],
          [x * 1.09, hy + hh * 0.65, z * 1.16],
          [x, hy + hh * 0.44, z * 1.18],
        ],
        id === 'zeus' ? 0.065 : 0.052,
        m.hair,
        'Head',
        18,
      );
      if (Math.cos(a) > 0.1)
        tube(
          [
            [x, hy + hh * 0.44, z * 1.18],
            [x + 0.035, hy + hh * 0.39, z * 1.18 + 0.018],
            [x + 0.06, hy + hh * 0.49, z * 1.12],
          ],
          0.023,
          m.hairLight,
          'Head',
          10,
        );
    } else {
      tube(
        [
          [x * 0.45, hy + hh * 0.98, z * 0.45],
          [x * 0.95, hy + hh * 0.67, z],
          [x * 1.06, hy + 0.1, z * 1.1],
          [x * 1.12, bottom, z],
          [x * 0.95, bottom - 0.1, z - 0.03],
        ],
        0.052,
        m.hair,
        'Head',
        22,
      );
      tube(
        [
          [x * 0.6, hy + hh * 0.92, z * 0.6],
          [x * 1.02, hy + hh * 0.6, z * 1.03],
          [x * 1.1, hy + 0.1, z * 1.12],
          [x * 1.1, bottom, z + 0.015],
        ],
        0.01,
        m.hairLight,
        'Head',
        22,
      );
    }
  }
  if (d.hairStyle === 'braid') {
    for (let i = 0; i < 11; i++) {
      const y = hy + 0.04 - i * 0.102;
      ellipsoid(
        [-0.28 + Math.sin(i * 0.8) * 0.025, y, 0.045 + i * 0.018],
        [0.072, 0.086, 0.08],
        m.hair,
        [0, 0.5, (i % 2 ? 1 : -1) * 0.5],
        'Head',
      );
    }
    ring([-0.27, hy - 0.99, 0.235], 0.06, 0.015, m.metal, [Math.PI / 2, 0, 0], [1, 1, 1], 'Head');
  }
  if (d.beard) {
    const long = d.beard !== 'short';
    const len = d.beard === 'cloud' ? 0.42 : d.beard === 'wave' ? 0.51 : 0.15;
    surface(
      40,
      22,
      (u, v) => {
        const a = (u - 0.5) * 2.55;
        const radius = hw * (0.89 * (1 - v) + 0.17 * v);
        return [
          Math.sin(a) * radius,
          hy - 0.1 - v * len + 0.045 * Math.cos(a),
          Math.cos(a) * (hd * 0.92 + 0.045) + 0.015 * v,
        ];
      },
      m.hair,
      'Head',
    );
    for (let i = 0; i < (long ? 15 : 11); i++) {
      const t = (i / (long ? 14 : 10) - 0.5) * 2;
      const x = t * hw * 0.81,
        y = hy - 0.07 - Math.abs(t) * 0.06;
      const z = hd * Math.sqrt(1 - t * t * 0.52) + 0.055;
      const end = y - len * (1 - Math.abs(t) * 0.38);
      tube(
        [
          [x, y, z],
          [x * 0.95, y - len * 0.3, z + 0.025],
          [x * 0.75 + 0.018 * Math.sin(i * 2), y - len * 0.65, z + 0.018],
          [x * 0.48, end, z - 0.013],
        ],
        long ? 0.045 : 0.022,
        m.hair,
        'Head',
        20,
      );
      if (d.beard === 'cloud')
        tube(
          [
            [x * 0.48, end + 0.03, z],
            [x * 0.48 + 0.034, end - 0.002, z + 0.018],
            [x * 0.48 + 0.046, end + 0.043, z + 0.025],
            [x * 0.48 + 0.015, end + 0.057, z + 0.02],
          ],
          0.022,
          m.hairLight,
          'Head',
          14,
        );
    }
    for (const side of [-1, 1])
      tube(
        [
          [0, hy - 0.115, hd + 0.045],
          [side * 0.09, hy - 0.126, hd + 0.075],
          [side * 0.18, hy - 0.158, hd + 0.025],
        ],
        long ? 0.036 : 0.022,
        m.hair,
        'Head',
        16,
      );
  }

  if (warrior) {
    surface(
      48,
      18,
      (u, v) => {
        const a = u * 2 * Math.PI;
        const t = v * (Math.cos(a) > 0.3 ? 1.05 : 1.6);
        return [
          Math.sin(t) * Math.sin(a) * (hw + 0.06),
          hy + 0.09 + Math.cos(t) * (hh + 0.055),
          -0.035 + Math.sin(t) * Math.cos(a) * (hd + 0.07),
        ];
      },
      m.metal,
      'Head',
    );
    tube(
      [
        [-hw * 0.89, hy + 0.31, 0.13],
        [-hw * 0.46, hy + 0.39, 0.26],
        [0, hy + 0.43, 0.295],
        [hw * 0.46, hy + 0.39, 0.26],
        [hw * 0.89, hy + 0.31, 0.13],
      ],
      0.022,
      m.dark,
      'Head',
      32,
    );
    surface(
      28,
      8,
      (u, v) => {
        const a = -0.45 + u * 2.8;
        const radius = 0.45 + v * 0.2;
        return [(v % 1) * 0.01, hy + 0.3 + Math.sin(a) * radius, -0.08 + Math.cos(a) * radius];
      },
      m.cloth,
      'Head',
    );
    for (let i = 0; i < 29; i++) {
      const a = -0.4 + (i * 2.7) / 28;
      tube(
        [
          [0, hy + 0.3 + Math.sin(a) * 0.44, -0.08 + Math.cos(a) * 0.44],
          [0, hy + 0.3 + Math.sin(a) * 0.64, -0.08 + Math.cos(a) * 0.64],
        ],
        0.014,
        m.cloth,
        'Head',
        2,
      );
    }
    for (const side of [-1, 1])
      plate(
        [
          [-0.045, 0.12],
          [0.052, 0.11],
          [0.048, -0.13],
          [-0.038, -0.07],
        ],
        0.035,
        m.metal,
        [side * (hw + 0.015), hy + 0.08, -0.065],
        [1, 1, 1],
        [0, side * 0.9, -side * 0.1],
        'Head',
      );
  }
  if (id === 'poseidon') {
    ring([0, hy + 0.32, 0], hw + 0.028, 0.025, m.metal, [Math.PI / 2, 0, 0], [1, 1, 0.88], 'Head');
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.6,
        x = Math.sin(a) * (hw + 0.035),
        z = Math.cos(a) * hd;
      tube(
        [
          [x, hy + 0.3, z],
          [x * 1.06, hy + 0.46, z],
          [x * 1.16, hy + 0.55 + (i % 2) * 0.05, z - 0.02],
        ],
        0.023,
        m.metal,
        'Head',
        12,
      );
    }
    plate(
      [
        [0, 0.08],
        [0.047, 0],
        [0, -0.08],
        [-0.047, 0],
      ],
      0.02,
      m.iris,
      [0, hy + 0.4, hd + 0.01],
      [1, 1, 1],
      [0, 0, 0],
      'Head',
    );
  }
  if (athletic) {
    cylinder([0, hy + 0.35, -0.04], hw * 0.72, hw * 1.18, 0.06, m.lining, [0, 0, -0.1], 'Head');
    ellipsoid([0, hy + 0.4, -0.04], [hw * 0.81, 0.17, hd * 0.87], m.lining, [0, 0, -0.1], 'Head');
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++)
        ellipsoid(
          [side * (hw * 0.84 + i * 0.045), hy + 0.45 + i * 0.035, -0.055 - i * 0.02],
          [0.035, 0.125 - i * 0.01, 0.036],
          m.metal,
          [0, 0, -side * (0.75 + i * 0.1)],
          'Head',
        );
  }
  if (id === 'zeus') {
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const a = side * (0.3 + i * 0.2);
        ellipsoid(
          [Math.sin(a) * (hw + 0.03), hy + 0.29 + i * 0.018, Math.cos(a) * (hd + 0.03)],
          [0.028, 0.061, 0.016],
          m.metal,
          [0, a, -side * 0.65],
          'Head',
        );
      }
  }

  const propX = -(w + 0.22),
    propZ = 0.245;
  if (id === 'zeus') {
    const lightning = material('Lightning', '#f5c658', 0.4, 0.25);
    lightning.emissive.set('#dba52a');
    lightning.emissiveIntensity = 0.25;
    plate(
      [
        [0.08, 0.82],
        [-0.13, 0.16],
        [0.025, 0.2],
        [-0.13, -0.56],
        [0.22, 0.27],
        [0.055, 0.2],
        [0.24, 0.82],
      ],
      0.055,
      lightning,
      [propX, 1.75, propZ],
      [1, 1, 1],
      [0, 0, -0.12],
    );
  }
  if (id === 'poseidon' || id === 'athena' || athletic) {
    cylinder([propX, 1.67, propZ], 0.025, 0.031, 3.08, id === 'athena' ? m.leather : m.metal);
    for (const y of [0.3, 1.45, 1.88, 3.1]) ring([propX, y, propZ], 0.035, 0.009, m.dark);
    if (id === 'athena')
      plate(
        [
          [0, 0.31],
          [-0.075, 0.04],
          [0, -0.05],
          [0.075, 0.04],
        ],
        0.035,
        m.metal,
        [propX, 3.17, propZ],
        [1, 1, 1],
      );
    if (id === 'poseidon') {
      tube(
        [
          [propX - 0.23, 3.53, propZ],
          [propX - 0.23, 3.18, propZ],
          [propX, 3.03, propZ],
          [propX + 0.23, 3.18, propZ],
          [propX + 0.23, 3.53, propZ],
        ],
        0.028,
        m.metal,
      );
      for (const x of [-0.23, 0, 0.23])
        plate(
          [
            [0, 0.24],
            [-0.055, 0.065],
            [0, 0],
            [0.055, 0.065],
          ],
          0.032,
          m.metal,
          [propX + x, x === 0 ? 3.45 : 3.4, propZ],
        );
    }
    if (athletic) {
      ellipsoid([propX, 3.1, propZ], [0.065, 0.065, 0.065], m.metal);
      for (const side of [-1, 1]) {
        tube(
          [
            [propX, 2.65, propZ],
            [propX + side * 0.12, 2.76, propZ],
            [propX, 2.91, propZ],
            [propX - side * 0.1, 2.99, propZ],
          ],
          0.018,
          m.metal,
        );
        for (let i = 0; i < 4; i++)
          ellipsoid(
            [propX + side * (0.1 + i * 0.057), 3.055 + i * 0.02, propZ],
            [0.09, 0.022, 0.025],
            m.metal,
            [0, 0, side * 0.35],
          );
      }
    }
  }
  if (warrior) {
    const x = w + 0.18,
      y = 1.87,
      z = 0.325,
      radius = id === 'ares' ? 0.43 : 0.38;
    ellipsoid([x, y, z], [radius, radius, 0.075], m.metal);
    ring([x, y, z + 0.018], radius * 0.92, 0.028, m.dark, [0, 0, 0]);
    ring([x, y, z + 0.059], radius * 0.73, 0.009, m.dark, [0, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ellipsoid(
        [x + Math.sin(a) * radius * 0.83, y + Math.cos(a) * radius * 0.83, z + 0.05],
        [0.013, 0.013, 0.013],
        m.dark,
      );
    }
    if (id === 'athena') {
      ellipsoid([x, y - 0.035, z + 0.085], [0.08, 0.115, 0.017], m.dark);
      for (const side of [-1, 1]) {
        ring([x + side * 0.05, y + 0.061, z + 0.095], 0.046, 0.014, m.dark, [0, 0, 0]);
        ellipsoid([x + side * 0.05, y + 0.061, z + 0.098], [0.019, 0.022, 0.012], m.pupil);
        plate(
          [
            [0, 0.07],
            [-0.029, 0],
            [0.022, 0],
          ],
          0.01,
          m.dark,
          [x + side * 0.067, y + 0.1, z + 0.087],
        );
      }
      plate(
        [
          [0, 0],
          [-0.024, 0.035],
          [0.024, 0.035],
        ],
        0.017,
        m.metal,
        [x, y + 0.005, z + 0.104],
      );
    } else {
      ellipsoid([x, y, z + 0.077], [0.097, 0.105, 0.043], m.dark);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        plate(
          [
            [0, 0.15],
            [-0.024, 0.025],
            [0.024, 0.025],
          ],
          0.008,
          m.dark,
          [x, y, z + 0.074],
          [1, 1, 1],
          [0, 0, a],
        );
      }
      cylinder([propX, 1.68, propZ], 0.036, 0.036, 0.3, m.leather);
      plate(
        [
          [-0.07, 0],
          [0.07, 0],
          [0.08, -0.64],
          [0, -0.84],
          [-0.08, -0.64],
        ],
        0.035,
        m.metal,
        [propX, 1.5, propZ],
      );
      tube(
        [
          [propX - 0.13, 1.52, propZ],
          [propX, 1.55, propZ],
          [propX + 0.13, 1.52, propZ],
        ],
        0.029,
        m.dark,
      );
      ellipsoid([propX, 1.87, propZ], [0.055, 0.05, 0.05], m.dark);
    }
  }
  for (const [part, forms] of Object.entries(skinForms)) {
    const resolution = part === 'Head' ? 72 : 72;
    const min = part === 'Head' ? [-0.6, hy - 0.6, -0.48] : [-1.15, 0.05, -0.45];
    const max = part === 'Head' ? [0.6, hy + 0.65, 0.55] : [1.15, 2.86, 0.52];
    const size = max.map((v, i) => v - min[i]);
    const field = new MarchingCubes(resolution, m.skin, false, false, 100000);
    field.isolation = 0;
    field.field.fill(-10);
    for (const { p, s, r } of forms) {
      const inverse = new Matrix4().makeRotationFromEuler(new Euler(...r)).invert().elements;
      const radius = Math.max(...s) + 0.06;
      const start = p.map((v, i) =>
        Math.max(1, Math.floor(((v - radius - min[i]) / size[i]) * resolution)),
      );
      const end = p.map((v, i) =>
        Math.min(resolution - 2, Math.ceil(((v + radius - min[i]) / size[i]) * resolution)),
      );
      const blend = part === 'Head' ? 0.023 : 0.052;
      for (let iz = start[2]; iz <= end[2]; iz++)
        for (let iy = start[1]; iy <= end[1]; iy++)
          for (let ix = start[0]; ix <= end[0]; ix++) {
            const x = min[0] + (ix / resolution) * size[0] - p[0],
              y = min[1] + (iy / resolution) * size[1] - p[1],
              z = min[2] + (iz / resolution) * size[2] - p[2];
            const lx = inverse[0] * x + inverse[4] * y + inverse[8] * z,
              ly = inverse[1] * x + inverse[5] * y + inverse[9] * z,
              lz = inverse[2] * x + inverse[6] * y + inverse[10] * z;
            const value =
              (1 - Math.sqrt((lx / s[0]) ** 2 + (ly / s[1]) ** 2 + (lz / s[2]) ** 2)) *
              Math.min(...s);
            const index = iz * resolution * resolution + iy * resolution + ix,
              previous = field.field[index];
            const h = Math.max(0, 1 - Math.abs(value - previous) / blend);
            field.field[index] = Math.max(value, previous) + blend * h * h * 0.25;
          }
    }
    field.update();
    const geometry = new BufferGeometry();
    for (const name of ['position', 'normal'])
      geometry.setAttribute(
        name,
        new Float32BufferAttribute(
          field.geometry.attributes[name].array.slice(0, field.count * 3),
          3,
        ),
      );
    geometry.scale(...size.map((v) => v * 0.5));
    geometry.translate(...min.map((v, i) => v + size[i] * 0.5));
    geometry.normalizeNormals();
    add(mergeVertices(geometry), m.skin, [0, 0, 0], [1, 1, 1], [0, 0, 0], part);
    field.geometry.dispose();
  }
  const root = new Group();
  root.name = `ATLAS ${id}`;
  root.userData = { author: 'ATLAS', version: 1, style: 'Original stylized sculpture', god: id };
  const sections = new Map();
  for (const { part, mat, shapes } of groups.values()) {
    if (!sections.has(part)) {
      const group = new Group();
      group.name = part;
      sections.set(part, group);
      root.add(group);
    }
    const geometry = mergeGeometries(shapes);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, mat);
    mesh.name = `${part} ${mat.name}`;
    sections.get(part).add(mesh);
    shapes.forEach((shape) => shape.dispose());
  }
  return root;
}

await mkdir(output, { recursive: true });
const manifest = {};
for (const [id, definition] of Object.entries(definitions)) {
  const model = makeSculpture(id, definition);
  const data = await new GLTFExporter().parseAsync(model, { binary: true, onlyVisible: true });
  const buffer = Buffer.from(data),
    hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const filename = `${id}-${hash}.glb`;
  await writeFile(`${output}${filename}`, buffer);
  let triangles = 0,
    draws = 0;
  model.traverse((node) => {
    if (node.isMesh) {
      draws++;
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
    }
  });
  manifest[id] = { model: `/models/avatars/${filename}`, bytes: buffer.length, triangles, draws };
  console.log(
    `${id}: ${(buffer.length / 1024).toFixed(0)} KB, ${triangles} triangles, ${draws} draws`,
  );
}
await writeFile(
  new URL('../src/domain/avatar-assets.json', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
