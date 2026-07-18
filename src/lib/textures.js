import * as THREE from 'three'
import { palette } from '../theme/palette.js'

// Shared, lazily-built canvas textures. Cached at module scope and reused across
// every chapter. They must survive per-chapter teardown, so each is registered in
// SHARED and Chapter.dispose() skips anything isSharedTexture() reports true for.

const SHARED = new Set()
const keep = (tex) => {
  SHARED.add(tex)
  return tex
}
export const isSharedTexture = (t) => SHARED.has(t)

// The radial backdrop is built from the current theme palette. resetBackground()
// drops the cache so the next call rebuilds it for the active theme.
let _bg = null
export function radialBackground() {
  if (_bg) return _bg
  const mid = new THREE.Color(palette.void2).lerp(new THREE.Color(palette.void), 0.55)
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(256, 150, 30, 256, 300, 460)
  grad.addColorStop(0, palette.void2)
  grad.addColorStop(0.5, '#' + mid.getHexString())
  grad.addColorStop(1, palette.void)
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  _bg = new THREE.CanvasTexture(c)
  _bg.colorSpace = THREE.SRGBColorSpace
  return keep(_bg)
}

export function resetBackground() {
  // Drop the cache (old texture is left orphaned but harmless; theme toggles are rare).
  _bg = null
}

let _glow = null
export function glowSprite() {
  if (_glow) return _glow
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  _glow = new THREE.CanvasTexture(c)
  return keep(_glow)
}

let _dot = null
export function dotSprite() {
  if (_dot) return _dot
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  _dot = new THREE.CanvasTexture(c)
  return keep(_dot)
}
