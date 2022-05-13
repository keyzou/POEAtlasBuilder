import React from 'react'
import { BsFillXCircleFill } from 'react-icons/bs'
import { createPortal } from 'react-dom'
import { BiImport } from 'react-icons/bi'
import {
  base64URLDecode,
  emitEvent,
  importTree,
  toUInt16,
  toUInt32
} from '../../utils'
import { ATLAS_TREE_POE_VERSION } from '../../constants'
import { useParams } from 'react-router'
import toast from 'react-hot-toast'
import ToastContainer from 'components/ui/ToastContainer'

interface ModalProps {
  show: boolean
  toggle: Function
}

const ImportTreeModal: React.FC<ModalProps> = ({ show, toggle }) => {
  const [showError, setShowError] = React.useState<string>()
  const [textareaText, setTextareaText] = React.useState<string>()

  const onHandleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    setTextareaText(event.target.value)
  }

  const onHandleImport = (encodedTree?: string): void => {
    if (!encodedTree) return
    try {
      importTree(encodedTree)
      toast.custom(t => (
        <ToastContainer
          t={t}
          variant='success'
          message='The tree has been imported.'
        />
      ))
    } catch (error: unknown) {
      toast.custom(t => (
        <ToastContainer
          t={t}
          variant='error'
          message={(error as Error).message}
        />
      ))
    }
  }

  return show
    ? createPortal(
        <div className='fixed top-0 left-0 z-30 flex  h-screen w-screen items-center justify-center'>
          <div
            className='fixed left-0 top-0 z-30 flex  h-screen w-full items-center justify-center bg-black bg-opacity-50'
            onClick={() => toggle()}
            role='none'
          />
          <div className='absolute z-40 flex w-1/2 flex-col rounded-xl bg-zinc-900 px-5 py-5 text-slate-300'>
            <h2 className='mb-7 w-full text-center text-2xl font-bold text-orange-400'>
              Import a tree
            </h2>

            {showError && (
              <div className='mb-5 flex items-center rounded bg-red-700 bg-opacity-10 px-5 py-3  text-red-500'>
                <BsFillXCircleFill className='mr-3 text-2xl' />
                <div className='flex flex-col'>
                  <span className='font-bold'>Oops !</span>
                  <span className='text-sm text-red-200'>{showError}</span>
                </div>
              </div>
            )}
            <p className='mb-3 text-sm font-bold text-zinc-400'>
              Use the following area to paste your encoded tree:
            </p>
            <textarea
              onChange={onHandleChange}
              name='import'
              className='mb-5 h-72 w-full flex-grow resize-none rounded bg-zinc-800 p-3 text-xs text-zinc-500 focus:outline-none'
            />
            <div className='flex justify-end'>
              <button
                type='button'
                onClick={() => toggle()}
                className='mr-3 cursor-pointer rounded border-2 border-zinc-800 py-1 px-7 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
              >
                Close
              </button>
              <button
                type='submit'
                onClick={() => onHandleImport(textareaText)}
                disabled={!textareaText}
                className='flex cursor-pointer items-center rounded bg-lime-900 py-1 pr-10 pl-8 font-bold text-lime-500 hover:bg-lime-800 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-40'
              >
                <BiImport className='mr-2 inline' />
                Import
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null
}

export default ImportTreeModal
