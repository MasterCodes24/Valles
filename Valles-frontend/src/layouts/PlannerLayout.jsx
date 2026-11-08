import React from 'react'
import { Outlet } from 'react-router-dom'
import { Zap, AlertTriangle } from 'lucide-react'
import './PlannerLayout.css'

export default function PlannerLayout() {
  return (
    <div className="planner-layout planner-mode">
      <header className="planner-header">
        <div className="planner-header-inner">
          <div className="planner-brand">
            <Zap size={20} className="planner-logo-icon" />
            <div>
              <div className="planner-title">VALLES MISSION PLANNER</div>
              <div className="planner-subtitle">SURFACE OPERATIONS ANALYSIS SYSTEM v2.1</div>
            </div>
          </div>
          <div className="planner-status">
            <div className="status-dot" />
            <span>SYSTEM NOMINAL</span>
            <span className="planner-time">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
          </div>
        </div>
      </header>
      <main className="planner-main">
        <div className="planner-scanline" />
        <Outlet />
      </main>
      <footer className="planner-footer">
        <AlertTriangle size={12} />
        <span>FOR AUTHORIZED MISSION PLANNING USE ONLY — All route decisions require human approval before execution</span>
      </footer>
    </div>
  )
}
