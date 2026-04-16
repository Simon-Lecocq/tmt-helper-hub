import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Demandes from './pages/Demandes'
import Classement from './pages/Classement'
import Admin from './pages/Admin'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/demandes"   element={<Demandes />} />
            <Route path="/classement" element={<Classement />} />
            <Route path="/admin"      element={<Admin />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  )
}
