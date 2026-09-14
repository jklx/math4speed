import React from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { MultiplayerProvider } from './MultiplayerContext'
import MultiplayerLobby from './MultiplayerLobby'
import Game from './Game'
import AdminView from './AdminView'
import UsernamePage from './UsernamePage'
import Leaderboard from './Leaderboard'
import ManagementPortal from './ManagementPortal'
import TrainingPage from './TrainingPage'
import AssignmentProgress from './AssignmentProgress'
import { StudentExamGame, StudentExamWait, TeacherExamRoom } from './ExamRoom'

export default function App() {
  return (
    <BrowserRouter>
      <MultiplayerProvider>
        <Routes>
          {/* Landing/Lobby */}
          <Route path="/" element={<MultiplayerLobby />} />
          
          {/* Training (single player) */}
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/training/:category" element={<TrainingPage />} />
          
          {/* Join room with username */}
          <Route path="/room/:roomId" element={<UsernamePage />} />
          
          {/* Active game/admin (separate routes for admin and players) */}
          <Route path="/play/:roomId" element={<Game isSinglePlayer={false} />} />
          <Route path="/admin/:roomId" element={<AdminView />} />

          {/* Leaderboard */}
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/leaderboard/:category" element={<Leaderboard />} />
          <Route path="/verwaltung" element={<ManagementPortal />} />
          <Route path="/verwaltung/klasse/:classId" element={<ManagementPortal />} />
          <Route path="/verwaltung/klasse/:classId/uebung/:assignmentId" element={<AssignmentProgress />} />
          <Route path="/mein-training" element={<Navigate to="/" replace />} />
          <Route path="/pruefungsraum/:roomId" element={<TeacherExamRoom />} />
          <Route path="/pruefung/:roomId" element={<StudentExamWait />} />
          <Route path="/pruefung/:roomId/spielen" element={<StudentExamGame />} />
          </Routes>
      </MultiplayerProvider>
    </BrowserRouter>
  )
}
