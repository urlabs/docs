import * as THREE from 'three'
import { isLight } from '../theme/theme.js'

// A loss surface: a bowl with ripples and one pronounced global minimum.
// Provides height()/grad() so a "weights" ball can roll downhill via gradient descent.
//
// Depth/relief is conveyed differently per theme:
//  - dark:  emissive neon glow + bloom (a glowing violet terrain in the void).
//  - light: a TOPOGRAPHIC height-color ramp (valley→teal, mid→violet, peaks→warm)
//           on a LIT surface, so both color-by-elevation AND light/shadow shading
//           make the third dimension obvious without any glow.
export class LossLandscape extends THREE.Group {
  constructor({ size = 20, seg = 90, color = '#7c3aed' } = {}) {
    super()
    this.size = size
    this.minX = 2.4
    this.minZ = -2.2
    const light = isLight()
    const col = new THREE.Color(color)

    this.geo = new THREE.PlaneGeometry(size, size, seg, seg)
    this.geo.rotateX(-Math.PI / 2)
    const p = this.geo.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, this.height(p.getX(i), p.getZ(i)))
    this.geo.computeVertexNormals()

    // bake a height ramp into vertex colors (used by the light surface)
    const cLow = new THREE.Color('#16a6c0') // valleys — low loss (cool)
    const cMid = new THREE.Color('#7c46c8') // slopes (violet, the brand color)
    const cHigh = new THREE.Color('#e0672c') // peaks — high loss (warm)
    const tmp = new THREE.Color()
    const HMIN = -2.8
    const HMAX = 4.0
    const cAttr = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      let t = (p.getY(i) - HMIN) / (HMAX - HMIN)
      t = Math.max(0, Math.min(1, t))
      if (t < 0.5) tmp.copy(cLow).lerp(cMid, t * 2)
      else tmp.copy(cMid).lerp(cHigh, (t - 0.5) * 2)
      cAttr[3 * i] = tmp.r
      cAttr[3 * i + 1] = tmp.g
      cAttr[3 * i + 2] = tmp.b
    }
    this.geo.setAttribute('color', new THREE.BufferAttribute(cAttr, 3))

    this.surface = new THREE.Mesh(
      this.geo,
      light
        ? new THREE.MeshStandardMaterial({
            vertexColors: true, // diffuse = the height ramp
            color: 0xffffff,
            roughness: 0.6,
            metalness: 0.0,
            emissive: 0x000000,
            flatShading: false,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x0a0e1a,
            emissive: col,
            emissiveIntensity: 0.34,
            roughness: 0.85,
            metalness: 0.0,
            transparent: true,
            opacity: 0.92,
          }),
    )
    this.add(this.surface)

    this.wire = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({
        color: light ? new THREE.Color('#2a2150') : col.clone(),
        wireframe: true,
        transparent: true,
        opacity: light ? 0.45 : 0.3,
        toneMapped: false,
      }),
    )
    this.add(this.wire)
  }

  height(x, z) {
    const r2 = x * x + z * z
    return (
      0.06 * r2 -
      2.4 * Math.exp(-(((x - this.minX) ** 2 + (z - this.minZ) ** 2) / 3.2)) +
      0.45 * Math.sin(x * 0.85) * Math.cos(z * 0.85) -
      0.6
    )
  }

  grad(x, z) {
    const e = 0.06
    return [
      (this.height(x + e, z) - this.height(x - e, z)) / (2 * e),
      (this.height(x, z + e) - this.height(x, z - e)) / (2 * e),
    ]
  }
}
