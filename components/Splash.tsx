'use client'
import { useEffect } from 'react'

export default function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash__logo-wrap">
        <img src="/logo.png" alt="Minha Estante" width={100} height={100} className="splash__logo" />
      </div>
      <h1 className="splash__title">Minha Estante</h1>
      <div className="splash__dots">
        <div className="splash__dot" /><div className="splash__dot" /><div className="splash__dot" />
      </div>
    </div>
  )
}
