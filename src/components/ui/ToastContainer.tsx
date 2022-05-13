import React from 'react'
import { Toast } from 'react-hot-toast'
import { FaCheck, FaInfo, FaTimes } from 'react-icons/fa'

interface Props {
  t: Toast
  message: React.ReactNode
  title?: React.ReactNode
  variant?: 'success' | 'error' | 'default'
}

const ToastContainer: React.FC<Props> = ({
  t,
  message,
  variant = 'default',
  title
}) => {
  const getTitle = React.useCallback(() => {
    if (title) return title
    if (variant === 'success') return 'Success !'
    if (variant === 'error') return 'Oops !'
    return 'Hey !'
  }, [variant, title])

  const getBgClasses = React.useCallback(() => {
    if (variant === 'success') return 'bg-green-900'
    if (variant === 'error') return 'bg-red-900'
    return 'bg-zinc-800'
  }, [variant])

  const getMessageClasses = React.useCallback(() => {
    if (variant === 'success') return 'text-green-100'
    if (variant === 'error') return 'text-red-100'
    return 'text-gray-300'
  }, [variant])

  const getTitleClasses = React.useCallback(() => {
    if (variant === 'success') return 'text-white'
    if (variant === 'error') return 'text-white'
    return 'text-orange-400'
  }, [variant])

  const getIconClasses = React.useCallback(() => {
    if (variant === 'success') return 'bg-green-600 text-green-100'
    if (variant === 'error') return 'bg-red-600 text-red-100'
    return 'bg-zinc-600 text-zinc-300'
  }, [variant])

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } pointer-events-auto flex w-full max-w-md rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${getBgClasses()}`}
    >
      <div className='flex items-start'>
        <div className='ml-5 mr-3 flex h-full items-center justify-center'>
          <span
            className={`flex items-center justify-center rounded-full p-2 text-sm ${getIconClasses()}`}
          >
            {variant === 'default' && <FaInfo />}
            {variant === 'success' && <FaCheck />}
            {variant === 'error' && <FaTimes />}
          </span>
        </div>
        <div className='flex-1 p-3'>
          <p className={`font-bold ${getTitleClasses()}`}>{getTitle()}</p>
          <p className={`mt-1 text-sm ${getMessageClasses()}`}>{message}</p>
        </div>
      </div>
    </div>
  )
}

export default ToastContainer
