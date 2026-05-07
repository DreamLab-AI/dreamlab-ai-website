import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './index.css'
import './styles/design-tokens.css'

// Sprint v9 D3: top-level ErrorBoundary prevents the SPA from white-screening
// when an uncaught error escapes a route or context provider.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
