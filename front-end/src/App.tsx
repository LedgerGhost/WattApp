import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login/login'
import Register from './pages/register/register'
import Map from './pages/map/map'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/map" element={<Map />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
