import type { ReactElement } from 'react'

interface Properties {
	error?: Error
}
const LoadingOrError = ({ error }: Properties): ReactElement => (
	<div className='flex min-h-screen items-center justify-center'>
		<h1 className='text-xl' data-testid='LoadingOrError'>
			{error ? error.message : 'Loading...'}
		</h1>
	</div>
)
LoadingOrError.defaultProps = {
	error: undefined
}

export default LoadingOrError
