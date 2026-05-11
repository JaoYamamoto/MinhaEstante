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

  function enter(u: UserPublic) { setUser(u); setScreen('home') }

  return (
    <>
      {screen === 'splash'   && <Splash onDone={() => setScreen('login')} />}
      {screen === 'login'    && <Login onLogin={enter} onGoToRegister={() => setScreen('register')} />}
      {screen === 'register' && <Register onRegistered={enter} onGoToLogin={() => setScreen('login')} />}
      {screen === 'home' && user && <Home user={user} onLogout={() => { setUser(null); setScreen('login') }} />}
    </>
  )
}
