import * as THREE from 'three';

// Builds a single reusable petal geometry: tapered, rounded silhouette
// with a gentle concave "cup" curvature and its pivot at the base so
// instances can be positioned/rotated to point outward from a center.
export function createPetalGeometry() {
  const wSeg = 6;
  const hSeg = 9;
  const geo = new THREE.PlaneGeometry(0.62, 1, wSeg, hSeg);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // -0.5 (base) .. 0.5 (tip)
    const t = y + 0.5; // 0..1 base to tip

    // silhouette: narrow at the base, widest a little past the middle,
    // rounding back in toward a soft tip
    const widthProfile = Math.sin(Math.PI * Math.pow(t, 0.72));
    const newX = x * (0.12 + 0.88 * widthProfile);

    // gentle concave cup along the length + slight curl at the edges
    const cupY = Math.sin(t * Math.PI) * 0.15;
    const edgeCurl = Math.pow(newX / 0.31, 2) * 0.06;
    const z = cupY - edgeCurl + (t > 0.85 ? (t - 0.85) * 0.4 : 0);

    pos.setX(i, newX);
    pos.setZ(i, z);
  }

  geo.translate(0, 0.5, 0); // pivot at base
  geo.computeVertexNormals();
  return geo;
}
