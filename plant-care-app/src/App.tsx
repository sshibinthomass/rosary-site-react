import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './app/AppShell';
import { AddPreview, GardenPreview, JournalPreview, ProfilePreview, TodayPreview } from './app/routes';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayPreview />} />
        <Route path="garden" element={<GardenPreview />} />
        <Route path="add" element={<AddPreview />} />
        <Route path="journal" element={<JournalPreview />} />
        <Route path="profile" element={<ProfilePreview />} />
      </Route>
    </Routes>
  );
}
