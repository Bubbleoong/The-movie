import { Outlet, Route, Routes } from 'react-router'
import { AnimationView } from '../view/AnimationView'
import { DetailView } from '../view/DetailView'
import { HomeView } from '../view/HomeView'
import { LoginView } from '../view/LoginView'
import { ForgotPasswordView } from '../view/ForgotPasswordView'
import { ResetPasswordView } from '../view/ResetPasswordView'
import { MovieView } from '../view/MovieView'
import { SearchView } from '../view/SearchView'
import { SeriesView } from '../view/SeriesView'
import { SignupView } from '../view/SignupView'
import { RoutePlaceholder } from '../component/RoutePlaceholder'
import { Navbar } from '../component/Navbar'
import { FavoritesProvider } from './FavoritesProvider'

function AppLayout() {
  return <FavoritesProvider><Navbar /><Outlet /><footer className="site-footer">ข้อมูลภาพยนตร์จาก <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a> · This product uses the TMDB API but is not endorsed or certified by TMDB.</footer></FavoritesProvider>
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeView />} />
        <Route path="/movies" element={<MovieView />} />
        <Route path="/series" element={<SeriesView />} />
        <Route path="/animation" element={<AnimationView />} />
        <Route path="/movie/:tmdbId" element={<DetailView mediaType="movie" />} />
        <Route path="/tv/:tmdbId" element={<DetailView mediaType="tv" />} />
        <Route path="/search" element={<SearchView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/signup" element={<SignupView />} />
        <Route path="/forgot-password" element={<ForgotPasswordView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="*" element={<RoutePlaceholder title="ไม่พบหน้า" note="ยังไม่มี route สำหรับ URL นี้" />} />
      </Route>
    </Routes>
  )
}
