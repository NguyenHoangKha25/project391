import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "../../styles/layout.css";

function MainLayout({
  children,
  title = "Dashboard",
  subtitle = "ScienceTrend Hub workspace",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (title) {
      document.title = `${title} | ScienceTrend Hub`;
    } else {
      document.title = "ScienceTrend Hub";
    }
  }, [title]);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="st-layout">
      <a className="st-skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />

      {sidebarOpen && (
        <button
          type="button"
          className="st-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}

      <div className="st-main">
        <Navbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen((current) => !current)}
        />
        <main className="st-content" id="main-content">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
