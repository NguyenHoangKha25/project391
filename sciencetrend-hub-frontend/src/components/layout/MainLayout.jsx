import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import "../../styles/layout.css";

function MainLayout({
  children,
  title = "Dashboard",
  subtitle = "ScienceTrend Hub workspace",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="st-layout">
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
