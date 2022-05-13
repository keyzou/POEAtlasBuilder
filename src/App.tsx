import LoadingOrError from 'components/LoadingOrError'
import { ReactElement } from 'react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const AtlasSkillTree = lazy(async () => import('pages/AtlasSkillTree'))

const App = (): ReactElement => (
  <BrowserRouter>
    <Routes>
      <Route
        path='/:tree'
        element={
          <Suspense fallback={<LoadingOrError />}>
            <AtlasSkillTree />
          </Suspense>
        }
      />
    </Routes>
  </BrowserRouter>
)

export default App
