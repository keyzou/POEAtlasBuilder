import {
  LeagueGroupedModifiers,
  GLOBAL_SKILL_MODIFIER_LOOKUP,
  Modifiers
} from 'data/skillModifiers'
import { SkillTreeContext } from 'pages/AtlasSkillTree'
import React from 'react'
import toast from 'react-hot-toast'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  FaChevronCircleLeft,
  FaChevronCircleRight,
  FaChevronRight
} from 'react-icons/fa'
import { CgImport, CgExport } from 'react-icons/cg'
import { useParams, usePrompt } from 'react-router-dom'
import reactStringReplace from 'react-string-replace'
import {
  emitEvent,
  importTree,
  useEventListener,
  useForceUpdate,
  useModal
} from 'utils'
import { leagueToIconsLookup } from '../constants'
import ExportTreeModal from './modals/ExportTreeModal'
import ImportTreeModal from './modals/ImportTreeModal'
import LoadTreeModal from './modals/LoadTreeModal'
import NotSavedConfirmationModal from './modals/NotSavedConfirmationModal'
import SaveTreeModal from './modals/SaveTreeModal'
import { Badge } from './ui/Badge'
import ToastContainer from './ui/ToastContainer'
import logo from '../assets/icons/icon.png'
import p from '../../package.json'

const TreeSummary: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState<boolean>(false)
  const skillTreeManager = React.useContext(SkillTreeContext)
  const [allocatedNodes, setAllocatedNodes] = React.useState<number[]>([])
  const [saveCallback, setSaveCallback] = React.useState<Function>()
  const [filterValue, setFilterValue] = React.useState<string>()

  const { isShowing: showImportModal, toggle: toggleImportModal } = useModal()
  const { isShowing: showExportModal, toggle: toggleExportModal } = useModal()
  const { isShowing: showSaveModal, toggle: toggleSaveModal } = useModal()
  const { isShowing: showLoadModal, toggle: toggleLoadModal } = useModal()
  const { isShowing: showConfirmationModal, toggle: toggleConfirmationModal } =
    useModal()

  const [leagueGroupedModifiers, setLeagueGroupedModifiers] =
    React.useState<LeagueGroupedModifiers>({})

  useEventListener('allocated-changed', (allocated: number[]) => {
    setAllocatedNodes(allocated)
  })
  const forceUpdate = useForceUpdate()

  const getLeagueFromIcon = (icon: string): string => {
    const filename = icon.split('\\').pop()?.split('/').pop()
    const iconName = filename?.substring(0, filename.lastIndexOf('.'))
    for (const [leagueName, icons] of Object.entries(leagueToIconsLookup)) {
      if (!iconName) continue
      if (icons.includes(iconName)) {
        return leagueName
      }
    }
    return 'N/A'
  }

  React.useEffect(() => {
    if (allocatedNodes.length === 0) return
    const allocatedNodeInfo = []
    const globalModifiersToApply: string[] = []
    for (const nodeInfo of skillTreeManager
      .filterNodes(x => allocatedNodes.includes(x.skill))
      .map(x => ({
        ...x,
        league: getLeagueFromIcon(x.icon)
      }))) {
      allocatedNodeInfo.push(nodeInfo)
      const skillStr = nodeInfo.skill.toString()
      if (
        !globalModifiersToApply.includes(skillStr) &&
        Object.keys(GLOBAL_SKILL_MODIFIER_LOOKUP).includes(skillStr)
      )
        globalModifiersToApply.push(skillStr)
    }

    const updatedModsGroups: LeagueGroupedModifiers = {}
    for (const nodeInfo of allocatedNodeInfo) {
      const nodePatch: LeagueGroupedModifiers = {}
      for (const x of nodeInfo.stats) {
        const matchPercent = x.match(/\+?(\d*\.?\d+)%/)
        const matchAdditional = x.match(/(an additional|[0-9]+ additional)/)
        const matchPlusFlat = x.match(/\+(\d*\.?\d+)/)
        const matchFlat = x.match(/(\d*\.?\d+)/)
        if (!Object.keys(nodePatch).includes(nodeInfo.league))
          nodePatch[nodeInfo.league] = {}

        if (matchPercent) {
          const generic = x.replace(/(\+?)(\d*\.?\d+)%/, '$1#%')
          const extractedValue = Number.parseFloat(matchPercent[0])
          if (!Object.keys(nodePatch[nodeInfo.league]).includes(generic))
            nodePatch[nodeInfo.league][generic] = { value: 0 }
          nodePatch[nodeInfo.league][generic].value += extractedValue
        } else if (matchAdditional) {
          const generic = x.replace(
            /(an additional|[0-9]+ additional)/,
            '# additional'
          )
          const clearedValue = matchAdditional[0]
            .replace('additional', '')
            .trim()
          const extractedValue = Number.parseInt(
            clearedValue === 'an' ? '1' : clearedValue,
            10
          )
          if (!Object.keys(nodePatch[nodeInfo.league]).includes(generic))
            nodePatch[nodeInfo.league][generic] = { value: 0 }
          nodePatch[nodeInfo.league][generic].value += extractedValue
        } else if (matchPlusFlat) {
          const generic = x.replace(/\+(\d*\.?\d+)/, '+#')
          const extractedValue = Number.parseFloat(matchPlusFlat[0])
          if (!Object.keys(nodePatch[nodeInfo.league]).includes(generic))
            nodePatch[nodeInfo.league][generic] = { value: 0 }
          nodePatch[nodeInfo.league][generic].value += extractedValue
        } else if (matchFlat) {
          const generic = x.replace(/(\d*\.?\d+)/, '#')
          const extractedValue = Number.parseFloat(matchFlat[0])
          if (!Object.keys(nodePatch[nodeInfo.league]).includes(generic))
            nodePatch[nodeInfo.league][generic] = { value: 0 }
          nodePatch[nodeInfo.league][generic].value += extractedValue
        } else {
          // No match, must be non-scalable modifier
          const generic = x
          if (!Object.keys(nodePatch[nodeInfo.league]).includes(generic))
            nodePatch[nodeInfo.league][generic] = { value: 1 }
        }
      }

      let copiedNodePatch = { ...nodePatch }
      for (const modifier of globalModifiersToApply) {
        copiedNodePatch = GLOBAL_SKILL_MODIFIER_LOOKUP[modifier](
          nodeInfo,
          copiedNodePatch
        )
      }

      for (const [league, mods] of Object.entries(copiedNodePatch)) {
        if (!updatedModsGroups[league]) updatedModsGroups[league] = {}
        for (const [modName, value] of Object.entries(mods)) {
          if (!updatedModsGroups[league][modName])
            updatedModsGroups[league][modName] = value
          else updatedModsGroups[league][modName].value += value.value
        }
      }
    }
    setLeagueGroupedModifiers(updatedModsGroups)
  }, [allocatedNodes, skillTreeManager])

  const onHandleSave = () => {
    if (!skillTreeManager.name) {
      toggleSaveModal()
    } else {
      skillTreeManager.saveCurrentTree()
    }
    forceUpdate()
  }

  const onHandleReset = (): void => {
    setAllocatedNodes([])
    setLeagueGroupedModifiers({})
    skillTreeManager.name = undefined
    skillTreeManager.path = []
    skillTreeManager.initialAllocated = []
    forceUpdate()
    setSaveCallback(undefined)
    emitEvent('reset-tree')
  }

  useHotkeys(
    'ctrl+s',
    event => {
      event.stopPropagation()
      event.preventDefault()
      onHandleSave()
    },
    [onHandleSave]
  )

  const onClickSummary = (): void => setCollapsed(!collapsed)
  const onClickNew = () => {
    if (!skillTreeManager.isDirty()) {
      onHandleReset()
      return
    }
    toggleConfirmationModal()
  }
  const onClickLoad = () => {
    toggleLoadModal()
  }

  const handleSaveProject = (callback: Function) => {
    if (skillTreeManager.name) {
      skillTreeManager.saveCurrentTree()
      callback()
      return
    }
    setSaveCallback(() => callback)
    toggleSaveModal()
    forceUpdate()
  }

  useHotkeys(
    'ctrl+n',
    event => {
      event.stopPropagation()
      event.preventDefault()
      onClickNew()
    },
    [onClickNew]
  )

  usePrompt(
    'You have unsaved changes ! Do you still wish to leave ?',
    skillTreeManager.isDirty()
  )

  React.useEffect(() => {
    if (skillTreeManager.isDirty()) {
      if (!document.title.startsWith('•'))
        document.title = `• ${document.title}`
    } else {
      if (document.title.startsWith('•'))
        document.title = document.title.slice(2)
    }
  }, [skillTreeManager, skillTreeManager.isDirty()])

  React.useEffect(() => {
    document.title = `${
      skillTreeManager.name ?? 'Untitled Tree'
    } - POE Atlas Builder`
  }, [skillTreeManager.name])

  const filterLeagues = React.useCallback(
    ([, modifiers]: [string, Modifiers]): boolean => {
      if (!filterValue) return true
      return Object.keys(modifiers).some(
        x =>
          x.toLowerCase().trim().indexOf(filterValue.toLowerCase().trim()) > -1
      )
    },
    [filterValue]
  )

  const onClickExport = async (): Promise<void> => {
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

  return (
    <>
      <ExportTreeModal show={showExportModal} toggle={toggleExportModal} />
      <ImportTreeModal show={showImportModal} toggle={toggleImportModal} />
      <SaveTreeModal
        show={showSaveModal}
        toggle={toggleSaveModal}
        callback={saveCallback}
      />
      <LoadTreeModal show={showLoadModal} toggle={toggleLoadModal} />
      <NotSavedConfirmationModal
        show={showConfirmationModal}
        toggle={toggleConfirmationModal}
        onDiscardCallback={onHandleReset}
        onSaveCallback={handleSaveProject}
      />
      <div
        className={`absolute top-0 z-20 h-full w-[32rem] transition-transform ease-in-out ${
          collapsed ? '-translate-x-[32rem]' : ''
        }`}
      >
        <div className='flex h-full w-[32rem] shrink flex-col bg-zinc-900 text-slate-400'>
          <div className='flex items-center justify-center py-3'>
            <img src={logo} className='w-10' alt='POE Atlas Builder' />
            <h1 className='font-serif ml-3 text-xl font-bold text-zinc-200'>
              POE Atlas Builder
              <small className='ml-2 text-slate-500'>v{p.version}</small>
            </h1>
          </div>
          <div className='flex flex-col items-center justify-center p-3'>
            <span className='text-sm font-bold uppercase italic text-slate-600'>
              Current Build
            </span>
            <div className='flex items-center justify-center'>
              {(!skillTreeManager.name || skillTreeManager.isDirty()) && (
                <i className='mr-1 h-2 w-2 rounded-full bg-red-600' />
              )}
              <h1 className='text-2xl font-semibold text-orange-400'>
                {skillTreeManager.name ?? (
                  <span className='italic'>Untitled tree</span>
                )}
              </h1>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-3 px-5'>
            <button
              type='button'
              disabled={allocatedNodes.length === 0}
              className='cursor-pointer rounded bg-zinc-800 py-1 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
              onClick={onClickNew}
            >
              New
            </button>
            <button
              type='button'
              disabled={allocatedNodes.length === 0}
              className='cursor-pointer rounded bg-zinc-800 py-1 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
              onClick={onHandleSave}
            >
              Save
            </button>
            <button
              type='button'
              className='cursor-pointer rounded bg-zinc-800 py-1 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
              onClick={onClickLoad}
            >
              Load
            </button>
            <button
              type='button'
              disabled={allocatedNodes.length === 0}
              className='flex cursor-pointer items-center justify-center rounded bg-zinc-800 py-1 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
              onClick={onClickExport}
            >
              <CgExport className='mr-2' />
              Export
            </button>
            <button
              type='button'
              onClick={toggleImportModal}
              className='flex cursor-pointer items-center justify-center rounded bg-zinc-800 py-1 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
            >
              <CgImport className='mr-2' />
              Import
            </button>
            <span className='flex items-center justify-center rounded py-1 text-xs font-bold text-zinc-500'>
              Atlas version:{' '}
              <Badge className='ml-2 bg-slate-700 text-slate-100'>3.18.0</Badge>
            </span>
          </div>
          <div className='p-3'>
            <h3 className='mt-3 mb-3 w-full text-center text-sm font-bold uppercase text-orange-400 text-opacity-70'>
              Current modifiers
            </h3>
            <input
              type='text'
              value={filterValue}
              placeholder='Search for modifiers...'
              className='mb-5 w-full  rounded bg-zinc-800 px-2.5 py-1.5 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-0'
              onChange={e => setFilterValue(e.target.value)}
            />
            <ul className='h-full overflow-y-auto'>
              {Object.entries(leagueGroupedModifiers)
                .filter(x => filterLeagues(x))
                .sort(([aLeague], [bLeague]) => aLeague.localeCompare(bLeague))
                .map(([leagueName, modules]) => (
                  <React.Fragment key={leagueName}>
                    <li className='mr-1 flex items-center'>
                      <i
                        className={`league league--${leagueName
                          .replace(/\s+/g, '-')
                          .toLowerCase()
                          .replace('/', '-')}`}
                      ></i>
                      <span className='font-bold text-orange-400'>
                        {leagueName}
                      </span>
                    </li>
                    <ul className='mb-5'>
                      {Object.entries(modules).map(
                        ([moduleDesc, moduleValue]) => (
                          <li
                            className='items-top mb-1 ml-4 flex text-sm'
                            key={moduleDesc}
                          >
                            <FaChevronRight className='mt-1 mr-1 inline text-orange-400 text-opacity-70' />
                            <span>
                              {reactStringReplace(moduleDesc, '#', () => {
                                return (
                                  <span
                                    key={moduleDesc}
                                    className='font-bold text-sky-500'
                                  >
                                    {moduleValue.value}
                                  </span>
                                )
                              })}
                              {moduleValue.source && (
                                <Badge className='ml-3 bg-zinc-800 text-zinc-300'>
                                  {moduleValue.source}
                                </Badge>
                              )}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </React.Fragment>
                ))}
            </ul>
          </div>
        </div>
        <button
          type='button'
          className='absolute top-0 -right-36 flex h-10 w-36 shrink-0 items-center justify-center rounded-br-lg bg-zinc-900 text-orange-400 hover:text-orange-300'
          onClick={onClickSummary}
        >
          <p className='text flex items-center text-center font-bold tracking-wider'>
            {collapsed && (
              <FaChevronCircleRight className='mr-2 text-orange-300' />
            )}
            {!collapsed && (
              <FaChevronCircleLeft className='mr-2 text-orange-300' />
            )}
            SUMMARY
          </p>
        </button>
      </div>
    </>
  )
}

export default TreeSummary
