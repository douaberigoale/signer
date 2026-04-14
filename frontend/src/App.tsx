import { Routes, Route, NavLink } from "react-router-dom";
import MainPage from "./pages/MainPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <>
      <nav className="nav">
        <a href="/" className="nav-brand">
          <span className="nav-brand-icon">✦</span>
          Signer
        </a>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Annotate
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Settings
          </NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  );
}
