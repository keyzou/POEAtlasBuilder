import { useEffect } from 'react'

interface Properties {
	title: string
}
const Head = ({ title }: Properties): null => {
	useEffect(() => {
		document.title = title
	}, [title])

	// eslint-disable-next-line unicorn/no-null
	return null
}

export default Head
