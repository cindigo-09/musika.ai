import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="mana-background d-flex flex-column vh-100 vw-100">
      <div className="spell-circle-bg"></div>

      <main className="flex-grow-1 d-flex justify-content-center align-items-center">
        <Outlet />
      </main>

      <footer
        className="p-3 text-center small opacity-50"
        style={{ fontFamily: "Space Mono", color: "var(--mana-gold)" }}
      >
        MUSIKA AI — MUSIC CURATOR © 2026
      </footer>
    </div>
  );
};

export default Layout;
