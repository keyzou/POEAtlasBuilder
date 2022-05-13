import React from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode | React.ReactNode[]
} & React.HTMLProps<HTMLSpanElement>

export const Badge: React.FC<Props> = ({
  size = 'md',
  children,
  className
}) => {
  return (
    <span
      className={`rounded py-0.5 px-2.5 text-xs font-semibold ${className}`}
      children={children}
    />
  )
}
