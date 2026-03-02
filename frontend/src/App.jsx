import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BookmarksProvider } from './lib/BookmarksContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import TableDetail from './pages/TableDetail'
import LoadOrder from './pages/LoadOrder'
import Audit from './pages/Audit'
import ColumnXRef from './pages/ColumnXRef'
import ErdView from './pages/ErdView'

export default function App() {
  return (
    <BookmarksProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tables" element={<Tables />} />
          <Route path="table" element={<TableDetail />} />
          <Route path="load-order" element={<LoadOrder />} />
          <Route path="audit" element={<Audit />} />
          <Route path="columns" element={<ColumnXRef />} />
          <Route path="erd"     element={<ErdView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </BookmarksProvider>
  )
}
