import { createRoot } from 'react-dom/client'
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
