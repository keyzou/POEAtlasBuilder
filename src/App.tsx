import LoadingOrError from 'components/LoadingOrError'
import type { ReactElement } from 'react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

const AtlasSkillTree = lazy(async () => import('pages/AtlasSkillTree'))

const App = (): ReactElement => (
	<BrowserRouter>
		<Suspense fallback={<LoadingOrError />}>
			<Switch>
				<Route path='/' component={AtlasSkillTree} />
			</Switch>
		</Suspense>
	</BrowserRouter>
)

export default App
