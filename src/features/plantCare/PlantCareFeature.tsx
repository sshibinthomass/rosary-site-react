import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import type { GardenRepository } from './data/gardenRepository';
import { PlantCareProvider } from './PlantCareProvider';
import PlantCareLayout from './components/PlantCareLayout';
import AddPlantPage from './pages/AddPlantPage';
import CareSettingsPage from './pages/CareSettingsPage';
import GardenPage from './pages/GardenPage';
import JournalPage from './pages/JournalPage';
import PlantDetailPage from './pages/PlantDetailPage';
import RosaryBenefitsPage from './pages/RosaryBenefitsPage';
import TodayPage from './pages/TodayPage';
import './styles.css';

interface PlantCareRoutesProps {
  user: { uid: string } | null;
  repository?: GardenRepository;
}

export function PlantCareRoutes({ user, repository }: PlantCareRoutesProps) {
  return (
    <PlantCareProvider user={user} repository={repository}>
      <Routes>
        <Route element={<PlantCareLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="garden" element={<GardenPage />} />
          <Route path="add" element={<AddPlantPage />} />
          <Route path="plants/:plantId" element={<PlantDetailPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="benefits" element={<RosaryBenefitsPage />} />
          <Route path="settings" element={<CareSettingsPage />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Route>
      </Routes>
    </PlantCareProvider>
  );
}

export default function PlantCareFeature() {
  const { user } = useAuth() as { user: { uid: string } | null };
  return <PlantCareRoutes user={user ? { uid: user.uid } : null} />;
}
