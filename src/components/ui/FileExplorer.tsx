import { SkillTreeDirectory } from 'data/skillTreeManager'
import React from 'react'
import { FaArrowUp, FaFolder, FaSitemap } from 'react-icons/fa'
import { getFromPath, setFromPath, useOutsideClick } from 'utils'
import { Badge } from './Badge'

interface Props {
  initialDir: SkillTreeDirectory
  onSelectItem: Function
  onPathChange: Function
}

const FileExplorer: React.FC<Props> = ({
  initialDir,
  onSelectItem,
  onPathChange
}) => {
  const [selectedItem, setSelectedItem] = React.useState<string>()
  const filesWrapper = React.useRef(null)
  const [isCreating, setCreating] = React.useState<boolean>(false)
  const [folderName, setFolderName] = React.useState<string>()

  const selectedClasses = 'bg-slate-700 hover:bg-slate-600'
  const defaultClasses = 'hover:bg-zinc-700'
  const selectedIconClasses = 'text-sky-500'
  const defaultIconClasses = 'text-zinc-600 group-hover:text-sky-500'

  const folderPrefix = '__dir__'

  const [currentPath, _setCurrentPath] = React.useState<string[]>([])
  const [currentView, setCurrentView] = React.useState<SkillTreeDirectory>({})

  React.useEffect(() => setCurrentView(initialDir), [initialDir])

  const setCurrentPath = React.useCallback(
    (path: string[]) => {
      _setCurrentPath(path)
      onPathChange(path)
    },
    [_setCurrentPath, onPathChange]
  )

  useOutsideClick(filesWrapper, () => {
    setSelectedItem(undefined)
  })
  const onClickFolder = (folderName: string, event: React.MouseEvent) => {
    if (event.detail === 1 && folderName !== '..') {
      setSelectedItem(folderName)
      return
    }
    let newPath
    if (folderName === '..') {
      newPath = currentPath.slice(0, currentPath.length - 2)
    } else {
      newPath = [...currentPath, folderName]
    }
    setCurrentPath(newPath)
    const newView = getFromPath<SkillTreeDirectory>(initialDir, newPath)
    setCurrentView(newView)
  }

  const onClickTree = (treeName: string, event: React.MouseEvent) => {
    setSelectedItem(treeName)
    if (!treeName) return
    onSelectItem(treeName)
  }
  const onClickDelete = () => {
    if (!selectedItem) return
    let path = currentPath
    if (!path) path = []
    setFromPath(initialDir, [...path, selectedItem])
    localStorage.setItem('saved-trees', JSON.stringify(initialDir))
    const newView = { ...currentView }
    delete newView[selectedItem]
    setCurrentView(newView)
  }

  const onClickCreate = () => {
    if (!folderName) return
    setFromPath(initialDir, [...currentPath, folderPrefix + folderName], {})
    setFolderName('')
    localStorage.setItem('saved-trees', JSON.stringify(initialDir))
  }

  const onClickNewFolder = () => {
    setCreating(true)
  }

  return (
    <>
      <div className='mb-3 flex'>
        <button
          type='button'
          onClick={onClickNewFolder}
          className='mr-2 cursor-pointer rounded bg-zinc-800 py-1 px-5 text-sm font-medium text-zinc-300 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
        >
          New Folder
        </button>
        <button
          type='button'
          onClick={onClickDelete}
          className='cursor-pointer rounded bg-zinc-800 py-1 px-5 text-sm font-medium text-zinc-300 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-300'
          disabled={!selectedItem}
        >
          Delete
        </button>
      </div>
      {isCreating && (
        <div className='mb-3'>
          <div className='mt-5 flex items-center'>
            <label htmlFor='folderName' className='mr-3 text-sm font-medium'>
              Folder name
            </label>
            <input
              type='text'
              value={folderName}
              onChange={event => {
                setFolderName(event.target.value)
              }}
              className='flex-grow rounded bg-zinc-800 px-2.5 py-1.5 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-0'
            />
            <button
              type='button'
              onClick={onClickCreate}
              disabled={!folderName || currentView.hasOwnProperty(folderName)}
              className='ml-3 flex cursor-pointer items-center rounded bg-lime-900 py-1.5 px-5 text-sm font-bold text-lime-100 hover:bg-lime-800 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40'
            >
              Create
            </button>
          </div>
          {folderName && currentView.hasOwnProperty(folderName) && (
            <span className='mt-3 block text-xs text-red-500'>
              Folder already exists
            </span>
          )}
        </div>
      )}
      <div className='flex items-center rounded-t bg-black bg-opacity-30  px-3 py-2'>
        {currentPath.length === 0 && (
          <span className='mr-2 flex-grow select-none text-sm font-bold text-zinc-600'>
            /
          </span>
        )}
        <div className='flex flex-grow'>
          {currentPath.map(path => (
            <div key={path} className='flex items-center'>
              <span className='mr-2 select-none text-sm font-bold text-zinc-600 first:ml-0'>
                /
              </span>
              <p className='mr-2 text-sm font-medium text-zinc-300'>
                {path.replace(folderPrefix, '')}
              </p>
            </div>
          ))}
        </div>
        {currentPath.length > 0 && (
          <button
            onClick={e => onClickFolder('..', e)}
            type='button'
            className='cursor-pointer rounded p-1.5 text-sm text-zinc-400 hover:bg-zinc-800'
          >
            <FaArrowUp />
          </button>
        )}
      </div>
      <div className='rounded-b bg-zinc-800'>
        <ul ref={filesWrapper}>
          {Object.entries(currentView).length === 0 && (
            <span className='block w-full py-3 text-center italic'>Empty</span>
          )}
          {Object.entries(currentView)
            .filter(([, type]) => !Array.isArray(type))
            .map(([buildName]) => (
              <li
                key={`${currentPath.join('-')}-${buildName}`}
                className={`group flex items-center px-3 py-2 hover:cursor-pointer ${
                  selectedItem === buildName ? selectedClasses : defaultClasses
                }`}
                onClick={e => onClickFolder(buildName, e)}
              >
                <FaFolder
                  className={`mr-3 text-sm ${
                    selectedItem === buildName
                      ? selectedIconClasses
                      : defaultIconClasses
                  }`}
                />
                <span className='flex-grow text-sm'>
                  {buildName.replace(folderPrefix, '')}
                </span>
              </li>
            ))}
          {Object.entries(currentView)
            .filter(([, type]) => Array.isArray(type))
            .map(([buildName, allocated]) => (
              <li
                key={`${currentPath.join('-')}-${buildName}`}
                className={`group flex items-center px-3 py-2 hover:cursor-pointer ${
                  selectedItem === buildName ? selectedClasses : defaultClasses
                }`}
                onClick={e => onClickTree(buildName, e)}
              >
                {Array.isArray(allocated) && (
                  <FaSitemap
                    className={`mr-3 text-sm ${
                      selectedItem === buildName
                        ? selectedIconClasses
                        : defaultIconClasses
                    }`}
                  />
                )}
                <span className='flex-grow text-sm'>{buildName}</span>
                {Array.isArray(allocated) && (
                  <Badge className='bg-sky-800 text-sky-100'>
                    {allocated.length} points
                  </Badge>
                )}
              </li>
            ))}
        </ul>
      </div>
    </>
  )
}

export default FileExplorer
