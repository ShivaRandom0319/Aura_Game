import { useEffect, useState } from 'react'
import RotateDeviceNotice from './components/RotateDeviceNotice'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import LobbyPage from './pages/LobbyPage'

const routes = {
  home: '/',
  join: '/join',
  about: '/about',
  lobby: '/lobby',
}

function getCurrentPath() {
  return window.location.pathname === '/' ? routes.home : window.location.pathname
}

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath)

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  const handleJoinLobby = () => {
    navigate(routes.lobby)
  }

  const renderPage = () => {
    if (currentPath === routes.join) {
      return <JoinPage onBack={() => navigate(routes.home)} onJoinLobby={handleJoinLobby} />
    }

    if (currentPath === routes.about) {
      return <AboutPage onBack={() => navigate(routes.home)} />
    }

    if (currentPath === routes.lobby) {
      return <LobbyPage onLeaveLobby={() => navigate(routes.home)} />
    }

    return (
      <HomePage
        onPlay={() => navigate(routes.join)}
        onAbout={() => navigate(routes.about)}
      />
    )
  }

  return (
    <>
      {renderPage()}
      <RotateDeviceNotice />
    </>
  )
}

export default App
