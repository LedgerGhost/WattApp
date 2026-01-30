import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { chargerImages } from './utils/chargerImages'

// Lazy load components
const Login = lazy(() => import('./pages/login/login'))
const Register = lazy(() => import('./pages/register/register.tsx'))
const Map = lazy(() => import('./pages/map/map'))
const Profile = lazy(() => import('./pages/profile/profile'))

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f7fafc',
    color: '#0d7d5a',
    fontSize: '24px',
    fontWeight: 'bold'
  }}>
    Loading...
  </div>
)

function App() {
  // Preload crucial images on mount
  useEffect(() => {
    chargerImages.forEach(src => {
      const img = new Image()
      img.src = src
    })
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<Map />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
