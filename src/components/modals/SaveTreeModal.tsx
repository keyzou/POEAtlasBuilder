import React from 'react'
import { createPortal } from 'react-dom'
import { SkillTreeDirectory } from '../../data/skillTreeManager'
import { FaSave, FaSitemap } from 'react-icons/fa'
import { SkillTreeContext } from '../../pages/AtlasSkillTree'
import FileExplorer from 'components/ui/FileExplorer'

interface ModalProps {
  show: boolean
  toggle: Function
  callback?: Function
}

const SaveTreeModal: React.FC<ModalProps> = ({ show, toggle, callback }) => {
  const [currentPath, setCurrentPath] = React.useState<string[]>([])
  const [treeName, setTreeName] = React.useState<string>('')
  const treeRenderer = React.useContext(SkillTreeContext)

  const savedBuilds = React.useMemo<SkillTreeDirectory>(() => {
    let savesStr = localStorage.getItem('saved-trees')
    if (!savesStr) savesStr = '{}'
    const saves = JSON.parse(savesStr)
    return saves
  }, [])

  const onSelectItem = (treeName: string): void => {
    setTreeName(treeName)
  }

  const onPathChange = (path: string[]): void => {
    setCurrentPath(path)
  }

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      if (!treeRenderer) return
      event.preventDefault()
      event.stopPropagation()
      treeRenderer.getSkillManager().name = treeName
      treeRenderer.getSkillManager().path = currentPath
      treeRenderer.getSkillManager().saveCurrentTree()

      toggle()
      if (callback) {
        callback()
      }
    },
    [callback, currentPath, treeRenderer, treeName, toggle]
  )

  return show
    ? createPortal(
        <div className='fixed top-0 left-0 z-30 flex  h-screen w-screen items-center justify-center'>
          <div
            className='fixed left-0 top-0 z-30 flex  h-screen w-full items-center justify-center bg-black bg-opacity-50'
            onClick={() => toggle()}
            role='none'
          />
          <div className='absolute z-40 flex w-1/3 flex-col rounded-xl bg-zinc-900 px-5 py-5 text-slate-300'>
            <h2 className='mb-7 w-full text-center text-2xl font-bold text-orange-400'>
              Save a tree
            </h2>

            <form onSubmit={handleSubmit}>
              <div className='mb-6'>
                <label
                  htmlFor='treeName'
                  className='mb-1 block text-sm font-semibold'
                >
                  Tree name
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    id='treeName'
                    required
                    value={treeName}
                    onChange={event => {
                      setTreeName(event.target.value)
                    }}
                    placeholder='Untitled tree'
                    className='peer w-full rounded bg-zinc-800 p-2.5 pl-10 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-0'
                  />
                  <FaSitemap className='absolute top-1/2 left-0 flex h-7 w-7 -translate-y-1/2 items-center border-transparent pl-3 text-zinc-600 focus:border-transparent focus:outline-none focus:ring-0 peer-valid:text-sky-500' />
                </div>
              </div>
              <div className='mb-6'>
                <FileExplorer
                  initialDir={savedBuilds}
                  onPathChange={onPathChange}
                  onSelectItem={onSelectItem}
                />
              </div>
              <div className='flex justify-end'>
                <button
                  type='button'
                  onClick={() => toggle()}
                  className='mr-3 cursor-pointer rounded border-zinc-800 py-1.5 px-7 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
                >
                  Close
                </button>
                <button
                  type='submit'
                  disabled={!treeName}
                  className='flex cursor-pointer items-center rounded bg-lime-900 py-1 pr-10 pl-8 font-bold text-lime-100 hover:bg-lime-800 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <FaSave className='mr-2 inline' />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null
}

export default SaveTreeModal
