import LoadingOrError from 'components/LoadingOrError'
import { ReactElement } from 'react'
import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

const AtlasSkillTree = lazy(async () => import('pages/AtlasSkillTree'))

const App = (): ReactElement => (
  <HashRouter>
    <Routes>
      <Route path='/' element={<Navigate to={'/tree'} />} />
      <Route
        path='/tree'
        element={
          <Suspense fallback={<LoadingOrError />}>
            <AtlasSkillTree />
          </Suspense>
        }
      />
      <Route
        path='/tree/:tree'
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
