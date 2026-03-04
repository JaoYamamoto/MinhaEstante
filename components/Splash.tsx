'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface SplashProps {
  onDone: () => void
}

export default function Splash({ onDone }: SplashProps) {
  useEffect(() => {
    // After 1.5s (1s display + 0.5s fade), call onDone
    const timer = setTimeout(onDone, 1500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash__logo-wrap">
        <Image
          src="/logo.jpg"
          alt="Minha Estante"
          width={100}
          height={100}
          className="splash__logo"
          priority
        />
      </div>
      <h1 className="splash__title">Minha Estante</h1>
      <div className="splash__dots">
        <div className="splash__dot" />
        <div className="splash__dot" />
        <div className="splash__dot" />
      </div>
    </div>
  )
}
