import * as THREE from 'three'

const _v = new THREE.Vector3()

// A crisp HTML label anchored to a 3D world position. Projected each frame onto
// screen space. Far cheaper and sharper than canvas-texture sprites for short text.
export class Label3D {
  constructor(text, opts = {}, container) {
    this.container = container || document.getElementById('labels')
    this.el = document.createElement('div')
    this._pill = !!opts.pill
    this.el.className = 'label ' + (opts.className || '') + (this._pill ? ' token' : '')
    this.position = (opts.position ? opts.position.clone() : new THREE.Vector3())
    this.offset = opts.offset || [0, 0]
    this._opacity = opts.opacity ?? 1
    this.visible = true
    this.hideBehind = opts.hideBehind ?? true
    this.setText(text)
    this.container.appendChild(this.el)
  }

  setText(t) {
    this.text = t
    this.el.innerHTML = this._pill ? `<span class="pill">${t}</span>` : t
    return this
  }

  setOpacity(o) {
    this._opacity = o
    return this
  }

  setVisible(v) {
    this.visible = v
    return this
  }

  update(camera) {
    if (!this.visible) {
      this.el.style.opacity = '0'
      return
    }
    _v.copy(this.position).project(camera)
    const behind = _v.z > 1
    if (behind && this.hideBehind) {
      this.el.style.opacity = '0'
      return
    }
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth + this.offset[0]
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight + this.offset[1]
    this.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    this.el.style.opacity = String(this._opacity)
  }

  dispose() {
    this.el.remove()
  }
}
