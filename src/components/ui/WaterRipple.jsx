// src/components/ui/WaterRipple.jsx
import { useState, useCallback } from 'react'

/**
 * WaterRipple wrapper: adds a fluid, water-drop ripple animation on click
 */
export function WaterRipple({ children, className = '', color = 'rgba(167, 139, 250, 0.35)', as = 'div', ...props }) {
  const [ripples, setRipples] = useState([])

  const createRipple = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    const newRipple = {
      x,
      y,
      size,
      id: Date.now() + Math.random(),
    }

    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 650)
  }, [])

  const Component = as

  return (
    <Component
      className={`relative overflow-hidden ${className}`}
      onClick={(e) => {
        createRipple(e)
        if (props.onClick) props.onClick(e)
      }}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: ripple.y,
            left: ripple.x,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animation: 'water-ripple 650ms cubic-bezier(0.1, 0.8, 0.2, 1) forwards',
          }}
        />
      ))}
    </Component>
  )
}
