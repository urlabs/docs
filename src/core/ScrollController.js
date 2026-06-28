import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Wires the scrolling prose "beats" to the active chapter:
//  - one trigger reports overall scroll progress (0..1) to the scene
//  - one trigger per beat toggles its active class + fires onStep(i)
export class ScrollController {
  constructor() {
    this.triggers = []
  }

  setup({ container, beats, onProgress, onStep }) {
    this.clear()

    this.triggers.push(
      ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => onProgress(self.progress),
      }),
    )

    beats.forEach((el, i) => {
      this.triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (self.isActive) {
              el.classList.add('is-active')
              onStep(i)
            } else {
              el.classList.remove('is-active')
            }
          },
        }),
      )
    })

    ScrollTrigger.refresh()
  }

  refresh() {
    ScrollTrigger.refresh()
  }

  clear() {
    for (const t of this.triggers) t.kill()
    this.triggers = []
  }
}
