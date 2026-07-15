import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import DialogHost from './components/DialogHost.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
    <DialogHost />
  </ErrorBoundary>,
)
