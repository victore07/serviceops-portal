import { Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { TicketsPage } from "./pages/TicketsPage";
import "./index.css";

function App() {
  return (
    <main className="app-shell">
      <Routes>
        <Route path="/" element={<TicketsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Routes>
    </main>
  );
}

export default App;