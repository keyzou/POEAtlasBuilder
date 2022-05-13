import LoadingOrError from 'components/LoadingOrError'
import { ReactElement } from 'react'
import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'

const AtlasSkillTree = lazy(async () => import('pages/AtlasSkillTree'))

const App = (): ReactElement => (
  <HashRouter>
    <Routes basename='/'>
      <Route
        path=':tree'
        element={
          <Suspense fallback={<LoadingOrError />}>
            <AtlasSkillTree />
          </Suspense>
        }
      />
    </Routes>
  </HashRouter>
)

export default App
