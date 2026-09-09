import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import SiteLayout from '@/layouts/SiteLayout';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';
import { Loader } from '@/components/Loader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import HomePage from '@/pages/HomePage';

const AllGamesPage = lazy(() => import('@/pages/AllGamesPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const GameDetailPage = lazy(() => import('@/pages/GameDetailPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const AchievementsPage = lazy(() => import('@/pages/AchievementsPage'));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ScrollToTop />
        <ErrorBoundary title="Something went wrong">
          <Routes>
            <Route element={<SiteLayout />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<Loader />}>
                    <HomePage />
                  </Suspense>
                }
              />
              <Route
                path="/games"
                element={
                  <Suspense fallback={<Loader />}>
                    <AllGamesPage />
                  </Suspense>
                }
              />
              <Route
                path="/games/:gameId"
                element={
                  <Suspense fallback={<Loader />}>
                    <GameDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/categories"
                element={
                  <Suspense fallback={<Loader />}>
                    <CategoriesPage />
                  </Suspense>
                }
              />
              <Route
                path="/categories/:slug"
                element={
                  <Suspense fallback={<Loader />}>
                    <CategoryPage />
                  </Suspense>
                }
              />
              <Route
                path="/favorites"
                element={
                  <Suspense fallback={<Loader />}>
                    <FavoritesPage />
                  </Suspense>
                }
              />
              <Route
                path="/achievements"
                element={
                  <Suspense fallback={<Loader />}>
                    <AchievementsPage />
                  </Suspense>
                }
              />
              <Route
                path="/statistics"
                element={
                  <Suspense fallback={<Loader />}>
                    <StatisticsPage />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Suspense fallback={<Loader />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="/privacy"
                element={
                  <Suspense fallback={<Loader />}>
                    <PrivacyPage />
                  </Suspense>
                }
              />
              <Route
                path="/about"
                element={
                  <Suspense fallback={<Loader />}>
                    <AboutPage />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<Loader />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
