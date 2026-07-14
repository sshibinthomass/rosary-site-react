import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './app/AppShell';
import { GardenProvider } from './features/garden/GardenProvider';
import AddPlantPage from './features/garden/AddPlantPage';
import GardenPage from './features/garden/GardenPage';
import PlantDetailPage from './features/garden/PlantDetailPage';
import TodayPage from './features/today/TodayPage';
import { JournalPreview, ProfilePreview } from './app/routes';

export default function App() {
  return (
    <GardenProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="garden" element={<GardenPage />} />
          <Route path="add" element={<AddPlantPage />} />
          <Route path="journal" element={<JournalPreview />} />
          <Route path="profile" element={<ProfilePreview />} />
          <Route path="plants/:plantId" element={<PlantDetailPage />} />
        </Route>
      </Routes>
    </GardenProvider>
  );
}
