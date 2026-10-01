import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { currentUser, logout } from '../api/auth'
import type { AuthUser } from '../api/auth'

const categories = [
  { path: "/", label: "หน้าแรก", end: true },
  { path: "/movies", label: "Movie" },
  { path: "/series", label: "Series" },
  { path: "/animation", label: "Anime / Cartoon" },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let active = true
    const update = () => { void currentUser().then(value => { if (active) setUser(value) }).catch(() => { if (active) setUser(null) }) }
    update()
    window.addEventListener('movie-auth-changed', update)
    return () => { active = false; window.removeEventListener('movie-auth-changed', update) }
  }, [])

  async function handleLogout() {
    try {
      await logout()
      setUser(null)
      window.dispatchEvent(new Event('movie-auth-changed'))
      navigate('/')
    } catch {
      // Keep the current identity visible if the server could not clear the session.
    }
  }

  useEffect(() => {
    setQuery(
      location.pathname === "/search"
        ? (new URLSearchParams(location.search).get("q") ?? "")
        : "",
    );
  }, [location.pathname, location.search]);

  function submitSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link className="brand" to="/" aria-label="The Movie Web หน้าแรก">
          <span className="brand-icon" aria-hidden="true">
            ▶
          </span>
          <span>
            THE MOVIE <strong>WEB</strong>
          </span>
        </Link>
        <nav className="category-nav" aria-label="หมวดหมู่">
          {categories.map((category) => (
            <NavLink
              key={category.path}
              to={category.path}
              end={category.end}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {category.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-tools">
          <form className="nav-search" role="search" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="site-search">
              ค้นหาชื่อเรื่อง
            </label>
            <input
              id="site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาหนังหรือซีรีส์..."
            />
            <button type="submit" aria-label="ค้นหา">
              ⌕
            </button>
          </form>
          <div className="auth-links">
            {user ? <><span>{user.email}</span><button type="button" onClick={handleLogout}>ออกจากระบบ</button></> : <>
              <Link to="/login">เข้าสู่ระบบ</Link>
              <Link className="signup-link" to="/signup">สมัครสมาชิก</Link>
            </>}
          </div>
        </div>
      </div>
    </header>
  );
}
