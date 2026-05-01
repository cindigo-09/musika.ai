import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import {
  BarChart3,
  HardDrive,
  Music2,
  Download,
  LogOut,
  Loader2,
  ListMusic,
} from "lucide-react";

// Chart.js Setup
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

// Export Tools
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [listeningHistory, setListeningHistory] = useState([]);

  useEffect(() => {
    // Check if admin is authenticated
    if (sessionStorage.getItem("isAdminAuth") !== "true") {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Songs
      const { data: songsData, error: songsErr } = await supabase
        .from("songs")
        .select("*");
      if (!songsErr) setSongs(songsData || []);

      // Fetch Activity Log (Wrap in try/catch in case table isn't created yet)
      const { data: logData } = await supabase
        .from("activity_log")
        .select("*")
        .order("performed_at", { ascending: false });
      setActivityLogs(logData || []);

      // Fetch Listening History
      const { data: historyData } = await supabase
        .from("listening_history")
        .select("*");
      setListeningHistory(historyData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    navigate("/");
  };

  // ============================
  // Metrics Calculations
  // ============================
  const totalTracks = songs.length;
  // Proxy for storage: 3.5MB average per track
  const estimatedStorageMB = (totalTracks * 3.5).toFixed(1);

  // Most Played Genre
  const getMostPlayedGenre = () => {
    if (listeningHistory.length > 0) {
      const counts = {};
      listeningHistory.forEach((log) => {
        const g = log.genre_context || "Unknown";
        counts[g] = (counts[g] || 0) + 1;
      });
      return Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b,
      );
    }
    return "Not enough data";
  };
  const mostPlayedGenre = getMostPlayedGenre();

  // Unique Genres
  const getUniqueGenresCount = () => {
    const uniqueGenres = new Set();
    songs.forEach(s => {
      if (s.genre) {
        s.genre.split(",").forEach(g => {
          const trimmed = g.trim();
          if (trimmed) uniqueGenres.add(trimmed);
        });
      }
    });
    return uniqueGenres.size;
  };
  const uniqueGenresCount = getUniqueGenresCount();

  // ============================
  // Chart Data Processing
  // ============================
  // Chart 1: Uploads per month
  const processMonthlyUploads = () => {
    const monthCounts = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    songs.forEach((s) => {
      if (s.created_at) {
        const date = new Date(s.created_at);
        const m = months[date.getMonth()];
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
    });

    const labels = Object.keys(monthCounts);
    const data = Object.values(monthCounts);

    return {
      labels: labels.length > 0 ? labels : ["No Data"],
      datasets: [
        {
          label: "Songs Uploaded",
          data: data.length > 0 ? data : [0],
          backgroundColor: "#7C3AED", // Purple accent
          borderRadius: 4,
        },
      ],
    };
  };

  // Chart 2: Artist Distribution
  const processArtistDistribution = () => {
    const artistCounts = {};
    songs.forEach((s) => {
      const a = s.artist || "Unknown";
      artistCounts[a] = (artistCounts[a] || 0) + 1;
    });

    return {
      labels: Object.keys(artistCounts),
      datasets: [
        {
          data: Object.values(artistCounts),
          backgroundColor: [
            "#7C3AED", // Purple
            "#0EA5E9", // Teal
            "#F59E0B", // Gold
            "#EC4899", // Pink
            "#10B981", // Green
            "#6366F1", // Indigo
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" } },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" }, position: "bottom" },
    },
  };

  // ============================
  // Export Functions
  // ============================
  const exportSongsCSV = () => {
    const csvData = songs.map((s) => ({
      Title: s.title,
      Artist: s.artist,
      Genre: s.genre || "N/A",
      Mood: s.mood_tag || "N/A",
      DateAdded: new Date(s.created_at).toLocaleDateString(),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "musika_library.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportActivityPDF = () => {
    const doc = new jsPDF();
    doc.text("Musika AI - Activity Log", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["Action", "Song Title", "Date & Time"];
    const tableRows = [];

    activityLogs.forEach((log) => {
      const rowData = [
        log.action.toUpperCase(),
        log.song_title || "Unknown",
        new Date(log.performed_at).toLocaleString(),
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237] }, // Purple header
    });

    doc.save("musika_activity_log.pdf");
  };

  if (loading) {
    return (
      <div className="vh-100 vw-100 d-flex align-items-center justify-content-center bg-dark text-white">
        <Loader2 className="animate-spin" size={48} color="#7C3AED" />
      </div>
    );
  }

  return (
    <div
      className="d-flex flex-column vh-100 vw-100 text-white"
      style={{ background: "#0D0D14" }}
    >
      <div className="d-flex flex-grow-1 overflow-hidden">
        <main className="flex-grow-1 p-4 p-md-5 overflow-auto custom-scrollbar">
          {/* Header Row */}
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div>
              <h2 className="fw-bold mb-1" style={{ color: "#F59E0B" }}>
                Admin Reports & Analytics
              </h2>
              <p className="text-secondary m-0">Platform summary and visualization</p>
            </div>
            <button className="btn btn-outline-danger d-flex align-items-center gap-2" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* Summary Cards */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <div className="p-4 rounded shadow-sm d-flex align-items-center gap-3" style={{ background: "#1a1a24", borderLeft: "4px solid #7C3AED" }}>
                <div className="p-3 rounded-circle" style={{ background: "rgba(124, 58, 237, 0.2)" }}>
                  <Music2 size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{totalTracks}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">Total Tracks</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="p-4 rounded shadow-sm d-flex align-items-center gap-3" style={{ background: "#1a1a24", borderLeft: "4px solid #0EA5E9" }}>
                <div className="p-3 rounded-circle" style={{ background: "rgba(14, 165, 233, 0.2)" }}>
                  <BarChart3 size={24} color="#0EA5E9" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{mostPlayedGenre}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">Top Genre</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="p-4 rounded shadow-sm d-flex align-items-center gap-3" style={{ background: "#1a1a24", borderLeft: "4px solid #F59E0B" }}>
                <div className="p-3 rounded-circle" style={{ background: "rgba(245, 158, 11, 0.2)" }}>
                  <HardDrive size={24} color="#F59E0B" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{estimatedStorageMB} MB</h3>
                  <span className="text-secondary small text-uppercase fw-bold">Storage Used</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="p-4 rounded shadow-sm d-flex align-items-center gap-3" style={{ background: "#1a1a24", borderLeft: "4px solid #EC4899" }}>
                <div className="p-3 rounded-circle" style={{ background: "rgba(236, 72, 153, 0.2)" }}>
                  <ListMusic size={24} color="#EC4899" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{uniqueGenresCount}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">Available Genres</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-5">
            <div className="col-lg-8">
              <div className="p-4 rounded shadow-sm h-100" style={{ background: "#1a1a24" }}>
                <h5 className="mb-4 text-white">Uploads Per Month</h5>
                <div style={{ height: "300px" }}>
                  <Bar data={processMonthlyUploads()} options={chartOptions} />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="p-4 rounded shadow-sm h-100 d-flex flex-column align-items-center" style={{ background: "#1a1a24" }}>
                <h5 className="mb-4 text-white w-100 text-start">Artist Distribution</h5>
                <div style={{ width: "250px", height: "250px" }}>
                  <Doughnut data={processArtistDistribution()} options={pieOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Row */}
          <div className="row g-4">
            <div className="col-12">
              <div className="p-4 rounded shadow-sm" style={{ background: "#1a1a24" }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="m-0 text-white">Transaction History</h5>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm text-white border-secondary d-flex align-items-center gap-2" style={{ background: "#2a2a36" }} onClick={exportSongsCSV}>
                      <Download size={14} /> Export Songs CSV
                    </button>
                    <button className="btn btn-sm text-white border-secondary d-flex align-items-center gap-2" style={{ background: "#2a2a36" }} onClick={exportActivityPDF}>
                      <Download size={14} /> Export Log PDF
                    </button>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: "400px" }}>
                  <table className="table table-dark table-hover border-secondary">
                    <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#1a1a24" }}>
                      <tr className="text-secondary small text-uppercase">
                        <th>Action</th>
                        <th>Song Title</th>
                        <th className="text-end">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.length > 0 ? (
                        activityLogs.map((log) => (
                          <tr key={log.id} className="align-middle">
                            <td>
                              <span className={`badge ${log.action === 'upload' ? 'bg-info text-dark' : 'bg-danger'} px-3 py-2 rounded-pill`}>
                                {log.action.toUpperCase()}
                              </span>
                            </td>
                            <td className="text-white fw-bold">{log.song_title || "Unknown"}</td>
                            <td className="text-secondary text-end">{new Date(log.performed_at).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-4 text-secondary">No activity logs found. Ensure you have run the database.sql setup script!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
