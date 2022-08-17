import { Menu } from '@headlessui/react'
import React from 'react'
import { FaChevronUp } from 'react-icons/fa'
import { classNames } from 'utils'

const Dropdown: React.FC = () => {
  return (
    <Menu as='div' className='relative block'>
      <Menu.Button
        className={classNames(
          'flex w-32 items-center bg-zinc-800 py-0.5 text-slate-300',
          'h-full'
        )}
      >
        <span className='flex-grow text-sm'>15 points</span>
        <FaChevronUp size='0.75rem' className='mx-2 text-slate-500' />
      </Menu.Button>
      <Menu.Items className='absolute -top-2 left-2 flex w-auto origin-top-right -translate-y-full transform flex-col whitespace-nowrap rounded-md bg-zinc-900 py-2 text-slate-300 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
        <Menu.Item>
          {({ active }) => (
            <a
              className={classNames(
                'px-4 py-1',
                'font-bold',
                'bg-zinc-800',
                'text-orange-400'
              )}
              href='/account-settings'
            >
              15 points
            </a>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <a
              className={classNames(active && 'bg-zinc-800', 'px-4 py-1')}
              href='/account-settings'
            >
              40 points
            </a>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <a
              className={classNames(active && 'bg-zinc-800', 'px-4 py-1')}
              href='/account-settings'
            >
              70 points
            </a>
          )}
        </Menu.Item>
        <Menu.Item>
          {({ active }) => (
            <a
              className={classNames(
                active && 'bg-zinc-800',
                'px-4 py-1',
                'mb-2'
              )}
              href='/account-settings'
            >
              80 points
            </a>
          )}
        </Menu.Item>
        <hr className='border-zinc-800' />
        <Menu.Item>
          {({ active }) => (
            <a
              className={classNames(active && 'bg-zinc-800', 'mt-2 px-4 py-1')}
              href='/account-settings'
            >
              Create new tree...
            </a>
          )}
        </Menu.Item>
      </Menu.Items>
    </Menu>
  )
}

export default Dropdown
