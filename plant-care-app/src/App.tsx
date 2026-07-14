import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './app/AppShell';
import { AuthProvider } from './features/auth/AuthProvider';
import { GardenProvider } from './features/garden/GardenProvider';
import AddPlantPage from './features/garden/AddPlantPage';
import GardenPage from './features/garden/GardenPage';
import PlantDetailPage from './features/garden/PlantDetailPage';
import TodayPage from './features/today/TodayPage';
import ProfilePage from './features/profile/ProfilePage';

const RosaryImportsPage = lazy(() => import('./features/rosary/RosaryImportsPage'));
const JournalPage = lazy(() => import('./features/journal/JournalPage'));

export default function App() {
  return (
    <AuthProvider>
      <GardenProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="garden" element={<GardenPage />} />
            <Route path="add" element={<AddPlantPage />} />
            <Route path="journal" element={<Suspense fallback={<p className="loading-line">Opening journal…</p>}><JournalPage /></Suspense>} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="rosary" element={<Suspense fallback={<p className="loading-line">Opening Rosary benefits…</p>}><RosaryImportsPage /></Suspense>} />
            <Route path="plants/:plantId" element={<PlantDetailPage />} />
          </Route>
        </Routes>
      </GardenProvider>
    </AuthProvider>
  );
}
