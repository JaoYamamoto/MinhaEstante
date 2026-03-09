'use client'

import { useEffect } from 'react'

interface SplashProps {
  onDone: () => void
}

export default function Splash({ onDone }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash__logo-wrap">
        {/* img nativo para evitar otimizações do Next.js que conflitam com o filtro CSS */}
        <img
          src="/logo.png"
          alt="Minha Estante"
          width={100}
          height={100}
          className="splash__logo"
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
