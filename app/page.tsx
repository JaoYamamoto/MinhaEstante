'use client'

import { useState } from 'react'
import Splash from '@/components/Splash'
import Login from '@/components/Login'
import Home from '@/components/Home'

type Screen = 'splash' | 'login' | 'home'

export default function Page() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [userEmail, setUserEmail] = useState('')

  function handleSplashDone() {
    setScreen('login')
  }

  function handleLogin(email: string) {
    setUserEmail(email)
    setScreen('home')
  }

  function handleLogout() {
    setUserEmail('')
    setScreen('login')
  }

  return (
    <>
      {screen === 'splash' && <Splash onDone={handleSplashDone} />}
      {screen === 'login' && <Login onLogin={handleLogin} />}
      {screen === 'home'  && <Home userEmail={userEmail} onLogout={handleLogout} />}
    </>
  )
}
