import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Activity, 
  PieChart, 
  Sliders 
} from 'lucide-react';
import './layout.css';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-ello">ello</span>
      </div>
      <div className="sidebar-subtitle">API SECURITY GATEWAY</div>
      
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard className="nav-icon" /> Dashboard
        </NavLink>
        <NavLink to="/attack-lab" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldAlert className="nav-icon" /> Attack Lab
        </NavLink>
        <NavLink to="/traffic" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity className="nav-icon" /> Traffic
        </NavLink>
        <NavLink 
          to="/analytics" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <PieChart className="nav-icon" /> Analytics
        </NavLink>
        <NavLink 
          to="/policies" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Sliders className="nav-icon" /> Policies
        </NavLink>
      </nav>
    </aside>
  );
};
