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
    <div className="st-layout" style={{ background: "#060d0b", color: "#ffffff" }}>
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
        <main className="st-content">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
