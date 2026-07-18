import './styles.css'
import { App } from './core/App.js'

const start = () => new App().boot()

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
