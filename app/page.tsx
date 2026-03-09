'use client'

import { useState } from 'react'
import Splash   from '@/components/Splash'
import Login    from '@/components/Login'
import Register from '@/components/Register'
import Home     from '@/components/Home'
import { type UserPublic } from '@/lib/api'

type Screen = 'splash' | 'login' | 'register' | 'home'

export default function Page() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [user,   setUser]   = useState<UserPublic | null>(null)

  function handleLogin(u: UserPublic)      { setUser(u); setScreen('home') }
  function handleRegistered(u: UserPublic) { setUser(u); setScreen('home') }
  function handleLogout()                  { setUser(null); setScreen('login') }

  return (
    <>
      {screen === 'splash'   && <Splash onDone={() => setScreen('login')} />}
      {screen === 'login'    && (
        <Login
          onLogin={handleLogin}
          onGoToRegister={() => setScreen('register')}
        />
      )}
      {screen === 'register' && (
        <Register
          onRegistered={handleRegistered}
          onGoToLogin={() => setScreen('login')}
        />
      )}
      {screen === 'home' && user && (
        <Home user={user} onLogout={handleLogout} />
      )}
    </>
  )
}
