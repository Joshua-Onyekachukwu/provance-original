import { useState } from 'react'

export default function InteractivePanel({ children, className = '' }) {
  const [style, setStyle] = useState({
    transform: 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)',
    background:
      'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02) 100%)',
  })

  const handleMove = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const rotateY = ((x - 50) / 50) * 4
    const rotateX = ((50 - y) / 50) * 4

    setStyle({
      transform: `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`,
      background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.16), rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.02) 100%)`,
    })
  }

  const handleLeave = () => {
    setStyle({
      transform: 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)',
      background:
        'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02) 100%)',
    })
  }

  return (
    <div
      className={`relative overflow-hidden transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transform: style.transform }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300"
        style={{ background: style.background }}
      />
      {children}
    </div>
  )
}
