import React, { useContext } from 'react'
import { BsFillXCircleFill } from 'react-icons/bs'
import { createPortal } from 'react-dom'
import { BiImport } from 'react-icons/bi'
import { base64URLDecode, emitEvent, toUInt16, toUInt32 } from '../../utils'
import { ATLAS_TREE_POE_VERSION } from '../../constants'
import { SkillTreeContext } from 'pages/AtlasSkillTree'
import toast from 'react-hot-toast'
import ToastContainer from 'components/ui/ToastContainer'
import axios from 'axios'

interface ModalProps {
  show: boolean
  toggle: Function
}

const ExportTreeModal: React.FC<ModalProps> = ({ show, toggle }) => {
  const skillTreeManager = useContext(SkillTreeContext)

  const onClickRaw = async (): Promise<void> => {
    const result = skillTreeManager.exportTree()
    await navigator.clipboard.writeText(result)
    toast.custom(t => (
      <ToastContainer
        t={t}
        variant='success'
        message={'The tree has been exported to your clipboard !'}
      />
    ))
  }

  const onClickPastebin = React.useCallback(async (): Promise<void> => {
    if (!process.env.REACT_APP_PASTEBIN_API_KEY) {
      toast.custom(t => (
        <ToastContainer
          t={t}
          variant='error'
          message={'No Pastebin API key found :('}
        />
      ))
      return
    }
    const result = skillTreeManager.exportTree()
    const formData = new URLSearchParams()
    formData.append('api_dev_key', process.env.REACT_APP_PASTEBIN_API_KEY)
    formData.append('api_paste_code', result)
    formData.append('api_paste_private', '0')
    formData.append(
      'api_paste_name',
      skillTreeManager.name ?? 'Untitled atlas tree'
    )
    formData.append('api_paste_expire_date', 'N')
    const response = await axios.postForm(
      'https://pastebin.com/api/api_post.php',
      formData
    )

    console.log(response.data)
  }, [skillTreeManager])

  return show
    ? createPortal(
        <div className='fixed top-0 left-0 z-30 flex  h-screen w-screen items-center justify-center'>
          <div
            className='fixed left-0 top-0 z-30 flex  h-screen w-full items-center justify-center bg-black bg-opacity-50'
            onClick={() => toggle()}
            role='none'
          />
          <div className='absolute z-40 flex w-[32rem] flex-col rounded-xl bg-zinc-900 text-slate-300'>
            <h2 className='mb-7 w-full px-5 py-5 text-center text-2xl font-bold text-orange-400'>
              Export a tree
            </h2>
            <div className='mb-10 flex items-center justify-center'>
              <button
                type='button'
                onClick={onClickRaw}
                className='mr-3 cursor-pointer rounded border-2 border-zinc-800 py-1 px-7 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
              >
                Copy Raw Tree
              </button>
              <button
                type='button'
                onClick={onClickPastebin}
                className='mr-3 cursor-pointer rounded border-2 border-zinc-800 py-1 px-7 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
              >
                Copy Pastebin link
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null
}

export default ExportTreeModal
