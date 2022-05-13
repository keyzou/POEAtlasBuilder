import React from 'react'
import { createPortal } from 'react-dom'
import { SkillTreeDirectory } from '../../data/skillTreeManager'
import { FaFileImport } from 'react-icons/fa'
import { SkillTreeContext } from '../../pages/AtlasSkillTree'
import FileExplorer from 'components/ui/FileExplorer'
import { emitEvent, getFromPath } from 'utils'

interface ModalProps {
  show: boolean
  toggle: Function
  callback?: Function
}

const LoadTreeModal: React.FC<ModalProps> = ({ show, toggle, callback }) => {
  const [treeName, setTreeName] = React.useState<string>('')
  const [currentPath, setCurrentPath] = React.useState<string[]>([])
  const skillTreeManager = React.useContext(SkillTreeContext)

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

  const onClickLoad = () => {
    const tree = getFromPath<number[]>(savedBuilds, [...currentPath, treeName])
    emitEvent('import-tree', tree)
    skillTreeManager.name = treeName
    skillTreeManager.path = currentPath
    skillTreeManager.initialAllocated = tree
    toggle()
  }

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
              Load a tree
            </h2>
            <div className='mb-6'>
              <FileExplorer
                initialDir={savedBuilds}
                onSelectItem={onSelectItem}
                onPathChange={onPathChange}
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
                type='button'
                onClick={onClickLoad}
                disabled={!treeName}
                className='flex cursor-pointer items-center rounded bg-lime-900 py-1 pr-10 pl-8 font-bold text-lime-100 hover:bg-lime-800 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40'
              >
                <FaFileImport className='mr-2 inline' />
                Load
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null
}

export default LoadTreeModal
