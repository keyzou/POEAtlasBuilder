import type { NodeContainer } from 'models/nodes'
import React from 'react'
import { BiImport } from 'react-icons/bi'
import { BsFillCheckCircleFill, BsFillXCircleFill } from 'react-icons/bs'
import {
	FaChevronCircleLeft,
	FaChevronCircleRight,
	FaChevronRight
} from 'react-icons/fa'
import reactStringReplace from 'react-string-replace'
import {
	base64URLDecode,
	base64URLEncode,
	emitEvent,
	toUInt16,
	toUInt32,
	UInt16ToBytes,
	UInt32ToBytes,
	useEventListener
} from 'utils'
import { ATLAS_TREE_POE_VERSION } from '../constants'

interface Properties {
	nodes: NodeContainer
}

const TreeSummary: React.FC<Properties> = ({ nodes }) => {
	const [collapsed, setCollapsed] = React.useState<boolean>(true)

	const [allocatedNodes, setAllocatedNodes] = React.useState<number[]>([])
	const [allocatedModuleGroups, setAllocatedModuleGroups] = React.useState<
		Record<string, number>
	>({})

	useEventListener('allocated-changed', (allocated: number[]) => {
		setAllocatedNodes(allocated)
	})

	React.useEffect(() => {
		if (allocatedNodes.length === 0) return
		const allocatedStats = []
		for (const stats of Object.values(nodes)
			.filter(x => allocatedNodes.includes(x.skill))
			.map(x => x.stats)) {
			allocatedStats.push(...stats)
		}
		const updatedModsGroups: Record<string, number> = {}
		for (const x of allocatedStats) {
			// Does it match #% ?
			const matchPercent = x.match(/\+?(\d*\.?\d+)%/)
			const matchAdditional = x.match(/an additional/)
			const matchPlusFlat = x.match(/\+(\d*\.?\d+)/)
			const matchFlat = x.match(/(\d*\.?\d+)/)
			if (matchPercent) {
				const generic = x.replace(/(\+?)(\d*\.?\d+)%/, '$1#%')
				const extractedValue = Number.parseFloat(matchPercent[0])
				if (!updatedModsGroups[generic] && updatedModsGroups[generic] !== 0)
					updatedModsGroups[generic] = 0
				updatedModsGroups[generic] += extractedValue
			} else if (matchAdditional) {
				const generic = x.replace(/an additional/, '#')
				const clearedValue = matchAdditional[0].replace('additional', '').trim()
				const extractedValue = Number.parseInt(
					clearedValue === 'an' ? '1' : clearedValue,
					10
				)
				if (!updatedModsGroups[generic] && updatedModsGroups[generic] !== 0)
					updatedModsGroups[generic] = 0
				updatedModsGroups[generic] += extractedValue
			} else if (matchPlusFlat) {
				const generic = x.replace(/\+(\d*\.?\d+)/, '+#')
				const extractedValue = Number.parseFloat(matchPlusFlat[0])
				if (!updatedModsGroups[generic] && updatedModsGroups[generic] !== 0)
					updatedModsGroups[generic] = 0
				updatedModsGroups[generic] += extractedValue
			} else if (matchFlat) {
				const generic = x.replace(/(\d*\.?\d+)/, '#')
				const extractedValue = Number.parseFloat(matchFlat[0])
				if (!updatedModsGroups[generic] && updatedModsGroups[generic] !== 0)
					updatedModsGroups[generic] = 0
				updatedModsGroups[generic] += extractedValue
			} else {
				// No match, must be non-scalable modifier
				const generic = x
				if (!updatedModsGroups[generic] && updatedModsGroups[generic] !== 1)
					updatedModsGroups[generic] = 1
			}
		}
		setAllocatedModuleGroups(updatedModsGroups)
	}, [allocatedNodes])

	const [showValidation, setShowValidation] = React.useState<string>()
	const [showError, setShowError] = React.useState<string>()
	const [showImportModal, setShowImportModal] = React.useState<boolean>(false)
	const [textareaText, setTextareaText] = React.useState<string>()

	const onHandleExport = async (): Promise<void> => {
		const concatedNodes = []

		for (const bytes of allocatedNodes
			.filter(x => x !== 29_045)
			.sort((a, b) => a - b)
			.map(x => UInt16ToBytes(x))) {
			concatedNodes.push(...bytes)
		}
		// eslint-disable-next-line no-bitwise
		const concated = [
			...UInt32ToBytes(6),
			0,
			0,
			allocatedNodes.length - 1,
			...concatedNodes,
			0,
			0
		]
		await navigator.clipboard.writeText(base64URLEncode(concated))
		setShowValidation('The tree has been copied to your clipboard !')
		setTimeout(() => setShowValidation(undefined), 10_000)
	}

	const onHandleChange = (
		event: React.ChangeEvent<HTMLTextAreaElement>
	): void => {
		setTextareaText(event.target.value)
	}

	const onHandleImport = (): void => {
		if (!textareaText) return
		try {
			const decoded = base64URLDecode(textareaText)
			let version = 0
			try {
				version = toUInt32(decoded.slice(0, 4))
			} catch {
				throw new Error('The tree you provided is invalid.')
			}
			const decodedClass = decoded[4]
			const ascendancy = decoded[5]
			if (version !== ATLAS_TREE_POE_VERSION)
				throw new Error(
					'The provided tree is either too old or not compatible.'
				)
			if (decodedClass > 0 || ascendancy > 0)
				throw new Error('The provided tree is not an Atlas Skill tree.')
			const nodesCount = decoded[6]
			const decodedNodes = []
			let cursor = 7
			for (let index = 0; index < nodesCount; index += 1) {
				let node = 0
				try {
					node = toUInt16(decoded.slice(cursor, cursor + 2))
				} catch {
					throw new Error('The tree you provided is invalid.')
				}
				decodedNodes.push(node)
				cursor += 2
			}
			emitEvent('import-tree', decodedNodes)
			setShowImportModal(false)
			setShowError(undefined)
		} catch (error: unknown) {
			setShowError((error as Error).message)
		}
	}

	const onHandleReset = (): void => {
		setAllocatedNodes([])
		setAllocatedModuleGroups({})
		emitEvent('reset-tree')
	}

	const onClickClose = (): void => setShowImportModal(false)
	const onClickImport = (): void => setShowImportModal(true)
	const onClickSummary = (): void => setCollapsed(!collapsed)

	/* eslint-disable jsx-a11y/click-events-have-key-events */
	return (
		<>
			{showImportModal && (
				<div className='flex w-full flex-none items-center justify-center'>
					<div
						className='absolute left-0 top-0 z-30 flex h-screen w-full items-center justify-center bg-black bg-opacity-50'
						onClick={onClickClose}
						role='none'
					/>

					<div className='relative z-30 flex w-1/2 select-none flex-col rounded-xl bg-zinc-900 px-5 py-5 text-slate-300'>
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
								onClick={onClickClose}
								className='mr-3 cursor-pointer rounded border-2 border-zinc-800 py-1 px-7 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
							>
								Close
							</button>
							<button
								type='submit'
								onClick={onHandleImport}
								disabled={!textareaText}
								className='flex cursor-pointer items-center rounded bg-lime-900 py-1 pr-10 pl-8 font-bold text-lime-500 hover:bg-lime-800 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-40'
							>
								<BiImport className='mr-2 inline' />
								Import
							</button>
						</div>
					</div>
				</div>
			)}
			<div
				className={`absolute top-0 z-20 h-full w-[32rem] pt-8 transition-transform ease-in-out ${
					collapsed ? '-translate-x-[32rem]' : ''
				}`}
			>
				<div className='flex h-full w-[32rem] shrink flex-col bg-zinc-900  p-3 text-slate-400'>
					<div className='mt-5 mb-5 flex justify-around'>
						<button
							type='button'
							disabled={allocatedNodes.length === 0}
							className='cursor-pointer rounded bg-zinc-800 py-1 px-10 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-500'
							onClick={onHandleExport}
						>
							Export
						</button>
						<button
							type='button'
							onClick={onClickImport}
							className='cursor-pointer rounded bg-zinc-800 py-1 px-10 font-bold text-zinc-500 hover:bg-stone-800 hover:text-orange-400'
						>
							Import
						</button>
						<button
							type='button'
							onClick={onHandleReset}
							className='cursor-pointer rounded bg-red-900 bg-opacity-30 py-1 px-10 font-bold text-red-200 text-opacity-50 hover:bg-red-900 hover:bg-opacity-40 hover:text-red-400'
						>
							Reset
						</button>
					</div>
					{showValidation && (
						<div className='mb-5 flex items-center rounded bg-lime-700 bg-opacity-10 px-5 py-3  text-lime-500'>
							<BsFillCheckCircleFill className='mr-3 text-2xl' />
							<div className='flex flex-col'>
								<span className='font-bold'>Success !</span>
								<span className='text-sm text-lime-200'>{showValidation}</span>
							</div>
						</div>
					)}
					<h3 className='mt-3 mb-3 w-full text-center text-sm font-bold uppercase text-orange-400 text-opacity-70'>
						Current modifiers
					</h3>
					<ul className='h-full overflow-y-auto'>
						{Object.entries(allocatedModuleGroups).map(
							([moduleDesc, moduleValue]) => (
								<li className='items-top mb-1 flex text-sm' key={moduleDesc}>
									<FaChevronRight className='mt-1 mr-1 inline h-full text-orange-400 text-opacity-70' />
									<span>
										{reactStringReplace(moduleDesc, '#', () => {
											if (moduleDesc.includes('#%'))
												return (
													<span
														key={moduleDesc}
														className='font-bold text-sky-500'
													>
														{moduleValue}
													</span>
												)
											if (moduleDesc.includes('+#'))
												return (
													<span
														key={moduleDesc}
														className='font-bold text-sky-500'
													>
														{moduleValue}
													</span>
												)
											return (
												<span
													key={moduleDesc}
													className='font-bold text-sky-500'
												>
													{moduleValue === 1 ? 'an' : moduleValue} additional
													{moduleValue > 1 ? 's' : ''}
												</span>
											)
										})}
									</span>
								</li>
							)
						)}
					</ul>
				</div>
				<button
					type='button'
					className='absolute top-8 -right-36 flex h-10 w-36 shrink-0 items-center justify-center rounded-br-lg bg-zinc-900 text-orange-400 hover:text-orange-300'
					onClick={onClickSummary}
				>
					<p className='text flex items-center text-center font-bold tracking-wider opacity-50'>
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
