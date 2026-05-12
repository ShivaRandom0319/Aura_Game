import { useCallback, useEffect, useState } from 'react'
import RotateDeviceNotice from './components/RotateDeviceNotice'
import AboutPage from './pages/AboutPage'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import LobbyPage from './pages/LobbyPage'
import { getStoredPlayerId, getStoredUsername } from './services/lobbyService'

const routes = {
  home: '/',
  join: '/join',
  about: '/about',
  lobby: '/lobby',
}

const knownRoutes = new Set(Object.values(routes))

function normalizePath(pathname) {
  const pathWithoutTrailingSlash =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  return knownRoutes.has(pathWithoutTrailingSlash) ? pathWithoutTrailingSlash : routes.home
}

function getCurrentPath() {
  return normalizePath(window.location.pathname)
}

function hasStoredLobbySession() {
  return Boolean(getStoredPlayerId() && getStoredUsername())
}

function replaceBrowserPath(path) {
  window.history.replaceState({}, '', path)
}

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath)

  const navigate = useCallback((path, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }

    setCurrentPath(path)
  }, [])

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  useEffect(() => {
    const normalizedPath = getCurrentPath()

    if (window.location.pathname !== normalizedPath) {
      replaceBrowserPath(normalizedPath)
      return
    }

    if (currentPath === routes.lobby && !hasStoredLobbySession()) {
      replaceBrowserPath(routes.home)
    }
  }, [currentPath])

  const handleJoinLobby = () => {
    navigate(routes.lobby)
  }

  const renderPage = () => {
    const activePath =
      currentPath === routes.lobby && !hasStoredLobbySession() ? routes.home : currentPath

    if (activePath === routes.join) {
      return <JoinPage onBack={() => navigate(routes.home)} onJoinLobby={handleJoinLobby} />
    }

    if (activePath === routes.about) {
      return <AboutPage onBack={() => navigate(routes.home)} />
    }

    if (activePath === routes.lobby) {
      return (
        <LobbyPage
          onLeaveLobby={() => navigate(routes.home)}
          onAccessDenied={() => navigate(routes.home, { replace: true })}
        />
      )
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
