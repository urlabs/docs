import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { bloomScale } from '../theme/theme.js'

// The cinematic look lives here: render → unreal bloom → output (color-managed).
// A single composer is reused across all chapters; we just swap which scene/camera
// the RenderPass points at.
export class PostFX {
  constructor(renderer) {
    this.renderer = renderer
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())

    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType, // preserve HDR so bloom reads values > 1
      samples: 4, // MSAA (the composer bypasses the renderer's own AA)
    })
    this.composer = new EffectComposer(renderer, rt)

    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera())
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.82, 0.4, 0.85)
    this.output = new OutputPass()

    this.composer.addPass(this.renderPass)
    this.composer.addPass(this.bloom)
    this.composer.addPass(this.output)
  }

  setScene(scene, camera) {
    this.renderPass.scene = scene
    this.renderPass.camera = camera
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.setSize(w, h)
  }

  // Chapters dial the glow to taste; the theme scales it (calmer in dark for eye
  // comfort, much lower in light so additive-free scenes don't wash out).
  setBloom(strength, radius, threshold) {
    if (strength != null) this.bloom.strength = strength * bloomScale()
    if (radius != null) this.bloom.radius = radius
    if (threshold != null) this.bloom.threshold = threshold
  }

  render() {
    this.composer.render()
  }
}
