import * as THREE from 'three'
import { glowSprite } from './textures.js'
import { emissiveNode } from './materials.js'
import { blend, isLight } from '../theme/theme.js'

// A single glowing node: an emissive core + an additive halo sprite.
// Owns its geometry (no module-level sharing) so per-chapter disposal is safe.
export class GlowNode extends THREE.Group {
  constructor({ color = '#22d3ee', radius = 0.32, halo = 1.0, glow = 1.4 } = {}) {
    super()
    this.color = new THREE.Color(color)
    this.baseRadius = radius
    this._light = isLight()

    this.geo = new THREE.SphereGeometry(1, 20, 20)
    this.mat = emissiveNode(color, glow)
    this.core = new THREE.Mesh(this.geo, this.mat)
    this.core.scale.setScalar(radius)
    this.add(this.core)

    if (halo > 0 && !this._light) {
      // halos are a dark-theme glow effect; on light they only wash out the node
      this.haloSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowSprite(),
          color: this.color.clone(),
          transparent: true,
          opacity: 0.45 * halo,
          depthWrite: false,
          blending: blend(),
          toneMapped: false,
        }),
      )
      this._haloScale = radius * 6 * halo
      this.haloSprite.scale.setScalar(this._haloScale)
      this.add(this.haloSprite)
    }
    this._level = 1
  }

  // 0..1 activation. Dark: glow harder (emissive + halo). Light: keep solid color,
  // signal activation mostly through size (low emissive so it never blooms to white).
  setLevel(v) {
    this._level = v
    if (!this._light) {
      // dark theme: glow harder with activation
      this.mat.emissiveIntensity = 0.25 + v * 1.7
      if (this.haloSprite) this.haloSprite.material.opacity = 0.1 + v * 0.6
    }
    // both themes: size signals activation (in light it's the primary cue, since the
    // node is opaque and solid-colored)
    this.core.scale.setScalar(this.baseRadius * (0.78 + v * 0.55))
  }

  setColor(color) {
    this.color.set(color)
    if (this._light) this.mat.color.set(color)
    else this.mat.emissive.set(color)
    if (this.haloSprite) this.haloSprite.material.color.set(color)
  }
}
