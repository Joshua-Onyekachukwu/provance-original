import { useEffect, useState } from 'react'

const BASE_STYLE = {
  transform: 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale(1)',
  background:
    'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02) 100%)',
}

/**
 * InteractivePanel — a 3D tilt-on-pointer-move card wrapper.
 *
 * Touch/pointer model:
 *  - Tilt is enabled only on devices with `(hover: hover) and (pointer: fine)`
 *    (mouse/trackpad). On touch, a tap synthesizes a single mouse-move but
 *    never a matching mouse-leave, which would leave the panel stuck tilted —
 *    so on coarse pointers the panel renders flat (no handlers attached).
 *  - `prefers-reduced-motion: reduce` also disables the tilt.
 */
export default function InteractivePanel({ children, className = '' }) {
  const [style, setStyle] = useState(BASE_STYLE)
  const [canTilt, setCanTilt] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setCanTilt(fine && !reduced)
  }, [])

  const handleMove = (event) => {
    if (!canTilt) return
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
    setStyle(BASE_STYLE)
  }

  return (
    <div
      className={`relative overflow-hidden transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transform: style.transform }}
      onMouseMove={canTilt ? handleMove : undefined}
      onMouseLeave={canTilt ? handleLeave : undefined}
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
