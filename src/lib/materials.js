import * as THREE from 'three'
import { dotSprite } from './textures.js'
import { blend, isLight } from '../theme/theme.js'

// Material factories so glow reads consistently everywhere. Emissive/additive +
// toneMapped:false keeps neon vivid and feeds the bloom pass.

export function emissiveNode(color, intensity = 1.3) {
  // Light theme: unlit solid accent sphere (dark-on-light) — ignores scene lights
  // (which would otherwise wash a lit material) and stays below the bloom threshold.
  // Dark theme: near-black base with a strong accent emissive that glows + blooms.
  if (isLight()) {
    // opaque so it shows full saturated color (semi-transparent would wash into the light bg)
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      toneMapped: false,
    })
  }
  return new THREE.MeshStandardMaterial({
    color: 0x070910,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.45,
    metalness: 0.0,
  })
}

export function glowBasic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: opacity < 1,
    opacity,
    toneMapped: false,
  })
}

export function additiveLine(color, opacity = 0.85, vertexColors = false) {
  return new THREE.LineBasicMaterial({
    color: vertexColors ? 0xffffff : new THREE.Color(color),
    vertexColors,
    transparent: true,
    opacity,
    blending: blend(), // additive in dark, normal in light (so colors read on a light bg)
    depthWrite: false,
    toneMapped: false,
  })
}

export function additivePoints(color, size = 0.14, opacity = 0.95, vertexColors = false) {
  return new THREE.PointsMaterial({
    color: vertexColors ? 0xffffff : new THREE.Color(color),
    vertexColors,
    size,
    map: dotSprite(),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: blend(),
    toneMapped: false,
  })
}
