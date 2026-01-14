import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CreateButton } from '@/components/shared/CreateButton';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background app-wallpaper">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <CreateButton />
    </div>

  );
}
