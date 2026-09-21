import { createRoot } from 'react-dom/client'
// Fuentes empaquetadas con la app (funcionan sin internet y sin que la política
// de seguridad de la app de escritorio las bloquee). Inter cubre todos los pesos.
import '@fontsource-variable/inter'
import '@fontsource/playfair-display/400-italic.css'   // solo titulares editoriales de portada
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import DialogHost from './components/DialogHost.jsx'
import { installGlobalErrorReporting } from './utils/errorReporter'

// Errores que nadie captura (excepciones sueltas, promesas sin catch). Son los
// que hoy se perdían por completo.
installGlobalErrorReporting('web')

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
    <DialogHost />
  </ErrorBoundary>,
)
