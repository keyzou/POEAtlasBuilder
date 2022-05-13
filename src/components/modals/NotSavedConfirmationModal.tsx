import React from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  show: boolean
  toggle: Function
  onSaveCallback: Function
  onDiscardCallback: Function
}

const NotSavedConfirmationModal: React.FC<ModalProps> = ({
  show,
  toggle,
  onSaveCallback,
  onDiscardCallback
}) => {
  const onClickDiscard = () => {
    toggle()
    onDiscardCallback()
  }

  const onClickSave = () => {
    toggle()
    onSaveCallback(onDiscardCallback)
  }

  return show
    ? createPortal(
        <div className='fixed top-0 left-0 z-30 flex  h-screen w-screen items-center justify-center'>
          <div
            className='fixed left-0 top-0 z-30 flex  h-screen w-full items-center justify-center bg-black bg-opacity-50'
            onClick={() => toggle()}
            role='none'
          />
          <div className='absolute z-40 flex w-[32rem] flex-col rounded-xl bg-zinc-900 text-slate-300'>
            <h2 className='mb-5 w-full py-5 px-5 text-center text-2xl font-medium text-orange-400'>
              Unsaved changes
            </h2>
            <p className='mb-10 px-5 text-center'>
              Your tree has unsaved changes.
              <br />
              <strong>All unsaved changes will be lost !</strong>
            </p>
            <div className='flex justify-end rounded-b-xl bg-zinc-800 px-5 py-5'>
              <button
                type='button'
                onClick={() => toggle()}
                className='mr-3 cursor-pointer rounded border-zinc-800 py-1.5 px-7 text-sm font-bold text-zinc-500 hover:bg-stone-700 hover:text-orange-400'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={onClickDiscard}
                className='mr-3 cursor-pointer rounded border-2 border-zinc-700 py-1.5 px-7 text-sm font-bold  text-red-500 hover:border-red-900 hover:border-opacity-50 hover:bg-red-900 hover:text-red-400'
              >
                Discard
              </button>
              <button
                type='button'
                onClick={onClickSave}
                className='flex cursor-pointer items-center rounded bg-lime-900 px-5 text-sm font-bold text-lime-100 hover:bg-lime-800 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40'
              >
                Save changes
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null
}

export default NotSavedConfirmationModal
