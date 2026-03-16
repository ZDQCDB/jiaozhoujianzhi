import { useMemo, useState } from 'react'
import { Landing } from './pages/Landing'
import { Studio } from './pages/Studio'
import { StudioProvider } from './store/studioStore'

type Route = { name: 'landing' } | { name: 'studio' }

function AppShell() {
  const [route, setRoute] = useState<Route>({ name: 'landing' })
  const providerKey = useMemo(() => Date.now().toString(), [route.name])

  return (
    <StudioProvider key={providerKey}>
      {route.name === 'landing' ? (
        <Landing onStart={() => setRoute({ name: 'studio' })} />
      ) : (
        <Studio onBackHome={() => setRoute({ name: 'landing' })} />
      )}
    </StudioProvider>
  )
}

function App() {
  return <AppShell />
}

export default App
