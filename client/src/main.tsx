import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { Toaster } from 'react-hot-toast' // +++

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster                                    // +++
      position="top-right"
      toastOptions={{
        style: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' },
      }}
    />
  </React.StrictMode>
)
