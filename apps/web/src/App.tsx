import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { loadPlayers } from "./lib/storage";
import { GamePage } from "./pages/GamePage";
import { SetupPage } from "./pages/SetupPage";
import type { Player } from "./types";

export function App() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    setPlayers(loadPlayers());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GamePage players={players} onPlayersChange={setPlayers} />} />
        <Route path="/setup" element={<SetupPage players={players} onPlayersChange={setPlayers} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
