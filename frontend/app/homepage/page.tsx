"use client";

import { useState } from 'react';
import { Bell, Sun, Moon, User, Database, Clock, Settings, Search } from 'lucide-react';

export default function Homepage() {
    const [activeTab, setActiveTab] = useState('query');
    const [isDarkMode, setIsDarkMode] = useState(false);

    return (
        <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
            {/* Top Header */}
            <header className="top-header">
                <div className="logo">RxVKG</div>
                <div className="header-actions">
                    <button className="icon-btn" aria-label="Notifications">
                        <Bell size={20} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        aria-label="Toggle theme"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button className="icon-btn user-btn" aria-label="User menu">
                        <User size={20} />
                    </button>
                </div>
            </header>

            <div className="main-layout">
                {/* Left Sidebar */}
                <aside className="sidebar">
                    <nav className="nav-menu">
                        <button
                            className={`nav-item ${activeTab === 'query' ? 'active' : ''}`}
                            onClick={() => setActiveTab('query')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                            </svg>
                            <span>Query</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
                            onClick={() => setActiveTab('explore')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>Explore</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'dashboards' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboards')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <span>Dashboards</span>
                        </button>
                    </nav>

                    <div className="sidebar-icons">
                        <button className="icon-only-btn" aria-label="Bookmarks">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                        </button>
                        <button className="icon-only-btn" aria-label="History">
                            <Clock size={20} />
                        </button>
                        <button className="icon-only-btn" aria-label="Settings">
                            <Settings size={20} />
                        </button>
                    </div>
                </aside>

                {/* Database Information Panel */}
                <aside className="db-panel">
                    <div className="panel-header">
                        <Database size={20} />
                        <h2>Database Information</h2>
                    </div>
                    <div className="panel-content">
                        <div className="info-section">
                            <h3>Connection Status</h3>
                            <div className="status-indicator">
                                <span className="status-dot active"></span>
                                <span>Connected</span>
                            </div>
                        </div>
                        <div className="info-section">
                            <h3>Database Stats</h3>
                            <div className="stat-item">
                                <span className="stat-label">Nodes:</span>
                                <span className="stat-value">0</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Relations:</span>
                                <span className="stat-value">0</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Labels:</span>
                                <span className="stat-value">0</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="main-content">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search nodes, relationships, or run queries..."
                            className="search-input"
                        />
                    </div>

                    <div className="graph-container">
                        <div className="graph-placeholder">
                            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                <circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.5" />
                                <circle cx="30" cy="40" r="6" fill="currentColor" opacity="0.5" />
                                <circle cx="90" cy="40" r="6" fill="currentColor" opacity="0.5" />
                                <circle cx="30" cy="80" r="6" fill="currentColor" opacity="0.5" />
                                <circle cx="90" cy="80" r="6" fill="currentColor" opacity="0.5" />
                                <line x1="60" y1="60" x2="30" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                                <line x1="60" y1="60" x2="90" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                                <line x1="60" y1="60" x2="30" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                                <line x1="60" y1="60" x2="90" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                            </svg>
                            <p className="placeholder-text">No graph data to display</p>
                            <p className="placeholder-subtext">Run a query to visualize your graph</p>
                        </div>
                    </div>
                </main>
            </div>

            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .app-container {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
                    color: #1a1a1a;
                    transition: all 0.3s ease;
                }

                .app-container.dark {
                    background: linear-gradient(135deg, #0a1929 0%, #1a2332 100%);
                    color: #e0e0e0;
                }

                /* Top Header */
                .top-header {
                    height: 56px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 24px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    z-index: 100;
                }

                .dark .top-header {
                    background: rgba(26, 35, 50, 0.95);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .logo {
                    font-size: 24px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: -0.5px;
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .icon-btn {
                    width: 36px;
                    height: 36px;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #666;
                    transition: all 0.2s ease;
                }

                .icon-btn:hover {
                    background: rgba(0, 0, 0, 0.05);
                    color: #1a1a1a;
                }

                .dark .icon-btn {
                    color: #b0b0b0;
                }

                .dark .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #e0e0e0;
                }

                .user-btn {
                    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
                    color: white;
                }

                .user-btn:hover {
                    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
                }

                /* Main Layout */
                .main-layout {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }

                /* Left Sidebar */
                .sidebar {
                    width: 180px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border-right: 1px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    flex-direction: column;
                    padding: 16px 12px;
                    gap: 16px;
                }

                .dark .sidebar {
                    background: rgba(26, 35, 50, 0.7);
                    border-right: 1px solid rgba(255, 255, 255, 0.08);
                }

                .nav-menu {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border: none;
                    background: transparent;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #666;
                    transition: all 0.2s ease;
                    text-align: left;
                }

                .nav-item:hover {
                    background: rgba(33, 150, 243, 0.08);
                    color: #2196f3;
                }

                .nav-item.active {
                    background: linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(25, 118, 210, 0.15) 100%);
                    color: #2196f3;
                    font-weight: 600;
                }

                .dark .nav-item {
                    color: #b0b0b0;
                }

                .dark .nav-item:hover {
                    background: rgba(33, 150, 243, 0.15);
                    color: #64b5f6;
                }

                .dark .nav-item.active {
                    background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(25, 118, 210, 0.2) 100%);
                    color: #64b5f6;
                }

                .sidebar-icons {
                    margin-top: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(0, 0, 0, 0.08);
                }

                .dark .sidebar-icons {
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                }

                .icon-only-btn {
                    width: 100%;
                    height: 40px;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #666;
                    transition: all 0.2s ease;
                }

                .icon-only-btn:hover {
                    background: rgba(0, 0, 0, 0.05);
                    color: #1a1a1a;
                }

                .dark .icon-only-btn {
                    color: #b0b0b0;
                }

                .dark .icon-only-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: #e0e0e0;
                }

                /* Database Panel */
                .db-panel {
                    width: 280px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border-right: 1px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }

                .dark .db-panel {
                    background: rgba(26, 35, 50, 0.7);
                    border-right: 1px solid rgba(255, 255, 255, 0.08);
                }

                .panel-header {
                    padding: 20px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(33, 150, 243, 0.05);
                }

                .dark .panel-header {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(33, 150, 243, 0.1);
                }

                .panel-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a1a1a;
                }

                .dark .panel-header h2 {
                    color: #e0e0e0;
                }

                .panel-content {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .info-section h3 {
                    font-size: 13px;
                    font-weight: 600;
                    color: #666;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .dark .info-section h3 {
                    color: #b0b0b0;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 12px;
                    background: rgba(76, 175, 80, 0.1);
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #2e7d32;
                }

                .dark .status-indicator {
                    background: rgba(76, 175, 80, 0.15);
                    color: #81c784;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #4caf50;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    font-size: 14px;
                }

                .stat-label {
                    color: #666;
                    font-weight: 500;
                }

                .dark .stat-label {
                    color: #b0b0b0;
                }

                .stat-value {
                    color: #1a1a1a;
                    font-weight: 600;
                    font-variant-numeric: tabular-nums;
                }

                .dark .stat-value {
                    color: #e0e0e0;
                }

                /* Main Content */
                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(245, 245, 245, 0.5) 100%);
                }

                .dark .main-content {
                    background: linear-gradient(135deg, rgba(10, 25, 41, 0.5) 0%, rgba(26, 35, 50, 0.5) 100%);
                }

                .search-bar {
                    margin: 24px 24px 16px;
                    position: relative;
                }

                .search-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #999;
                }

                .search-input {
                    width: 100%;
                    padding: 14px 16px 14px 44px;
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    border-radius: 12px;
                    font-size: 14px;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(10px);
                    transition: all 0.2s ease;
                    color: #1a1a1a;
                }

                .search-input::placeholder {
                    color: #999;
                }

                .search-input:focus {
                    outline: none;
                    border-color: #2196f3;
                    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
                    background: white;
                }

                .dark .search-input {
                    background: rgba(26, 35, 50, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                }

                .dark .search-input:focus {
                    background: rgba(26, 35, 50, 1);
                    border-color: #64b5f6;
                    box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.15);
                }

                .graph-container {
                    flex: 1;
                    margin: 0 24px 24px;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
                }

                .dark .graph-container {
                    background: rgba(26, 35, 50, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .graph-placeholder {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                }

                .placeholder-text {
                    margin-top: 24px;
                    font-size: 18px;
                    font-weight: 600;
                    color: #666;
                }

                .dark .placeholder-text {
                    color: #b0b0b0;
                }

                .placeholder-subtext {
                    margin-top: 8px;
                    font-size: 14px;
                    color: #999;
                }

                .dark .placeholder-subtext {
                    color: #808080;
                }

                /* Responsive Design */
                @media (max-width: 1024px) {
                    .db-panel {
                        width: 240px;
                    }

                    .sidebar {
                        width: 160px;
                    }
                }

                @media (max-width: 768px) {
                    .db-panel {
                        display: none;
                    }

                    .sidebar {
                        width: 70px;
                    }

                    .nav-item span {
                        display: none;
                    }

                    .nav-item {
                        justify-content: center;
                        padding: 12px;
                    }

                    .search-bar {
                        margin: 16px 16px 12px;
                    }

                    .graph-container {
                        margin: 0 16px 16px;
                    }
                }
            `}</style>
        </div>
    );
}
