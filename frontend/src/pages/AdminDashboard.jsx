import React, { useEffect, useMemo, useState } from "react";
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
  Users,
  Search,
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

const AGE_BRACKETS = [
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55+", min: 55, max: 999 },
];

function monthKey(date) {
  // YYYY-MM
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split("-");
  const month = Number(m);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[month - 1]} ${y}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [songs, setSongs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [listeningHistory, setListeningHistory] = useState([]);

  // NEW: profiles analytics
  const [profiles, setProfiles] = useState([]);
  const [profileSearch, setProfileSearch] = useState("");

  useEffect(() => {
    // Check if admin is authenticated
    if (sessionStorage.getItem("isAdminAuth") !== "true") {
      navigate("/admin/login");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Songs
      const { data: songsData, error: songsErr } = await supabase
        .from("songs")
        .select("*");
      if (!songsErr) setSongs(songsData || []);

      // Fetch Activity Log
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

      // NEW: Fetch Profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("*");
      if (!profilesErr) setProfiles(profilesData || []);
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

  const getUniqueGenresCount = () => {
    const uniqueGenres = new Set();
    songs.forEach((s) => {
      if (s.genre) {
        s.genre.split(",").forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) uniqueGenres.add(trimmed);
        });
      }
    });
    return uniqueGenres.size;
  };
  const uniqueGenresCount = getUniqueGenresCount();

  // ============================
  // Chart data for songs
  // ============================
  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#fff" } } },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" } },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#fff" }, position: "bottom" } },
  };

  const processMonthlyUploads = () => {
    const monthCounts = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

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
          backgroundColor: "#7C3AED",
          borderRadius: 4,
        },
      ],
    };
  };

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
            "#7C3AED",
            "#0EA5E9",
            "#F59E0B",
            "#EC4899",
            "#10B981",
            "#6366F1",
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  // ============================
  // NEW: Profiles / User Insights
  // ============================
  const latestProfiles = useMemo(() => {
    return [...profiles].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) -
        new Date(a.updated_at || a.created_at),
    );
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return latestProfiles;

    return latestProfiles.filter((p) => {
      const u = String(p.username || "").toLowerCase();
      const e = String(p.email || "").toLowerCase();
      return u.includes(q) || e.includes(q);
    });
  }, [latestProfiles, profileSearch]);

  const userSummary = useMemo(() => {
    const totalUsers = profiles.length;

    const ages = profiles
      .map((p) => (typeof p.age === "number" ? p.age : Number(p.age)))
      .filter((n) => Number.isFinite(n) && n >= 0);

    const avgAge =
      ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null;

    return { totalUsers, avgAge };
  }, [profiles]);

  const genrePopularityIndex = useMemo(() => {
    const counts = {};
    profiles.forEach((p) => {
      const raw = p.favorite_genre || "";
      const parts = String(raw)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      parts.forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      entries,
      labels: entries.map((e) => e[0]),
      data: entries.map((e) => e[1]),
    };
  }, [profiles]);

  const monthlyGrowthBarData = useMemo(() => {
    const countsByMonth = {};
    profiles.forEach((p) => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = monthKey(d);
      countsByMonth[key] = (countsByMonth[key] || 0) + 1;
    });

    const months = Object.keys(countsByMonth).sort();
    if (months.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            label: "New Signups",
            data: [0],
            backgroundColor: "#7C3AED",
            borderRadius: 4,
          },
        ],
      };
    }

    const labels = months.map(formatMonthLabel);
    const data = months.map((m) => countsByMonth[m]);

    return {
      labels,
      datasets: [
        {
          label: "New Signups",
          data,
          backgroundColor: "#7C3AED",
          borderRadius: 4,
        },
      ],
    };
  }, [profiles]);

  const ageDistributionData = useMemo(() => {
    const bracketCounts = AGE_BRACKETS.map(() => 0);

    profiles.forEach((p) => {
      const age = typeof p.age === "number" ? p.age : Number(p.age);
      if (!Number.isFinite(age)) return;

      const idx = AGE_BRACKETS.findIndex((b) => age >= b.min && age <= b.max);
      if (idx >= 0) bracketCounts[idx] += 1;
    });

    return {
      labels: AGE_BRACKETS.map((b) => b.label),
      datasets: [
        {
          label: "Users",
          data: bracketCounts,
          backgroundColor: [
            "#7C3AED",
            "#0EA5E9",
            "#F59E0B",
            "#EC4899",
            "#10B981",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [profiles]);

  const preferencePieData = useMemo(() => {
    // Use actual listening behavior: listening_history.genre_context
    const counts = {};

    listeningHistory.forEach((log) => {
      const g = (log.genre_context || "").trim();
      if (!g) return;
      counts[g] = (counts[g] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);

    if (top.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0], backgroundColor: ["#7C3AED"], borderWidth: 0 }],
      };
    }

    return {
      labels: top.map((e) => e[0]),
      datasets: [
        {
          data: top.map((e) => e[1]),
          backgroundColor: [
            "#7C3AED",
            "#0EA5E9",
            "#F59E0B",
            "#EC4899",
            "#10B981",
            "#6366F1",
            "#F97316",
            "#22C55E",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [listeningHistory]);

  // Export: profiles CSV
  const exportProfilesCSV = () => {
    const csvRows = profiles.map((p) => ({
      id: p.id,
      username: p.username || "",
      email: p.email || "",
      bio: p.bio || "",
      age: p.age ?? "",
      favorite_genre: p.favorite_genre || "",
      created_at: p.created_at ? new Date(p.created_at).toLocaleString() : "",
      updated_at: p.updated_at ? new Date(p.updated_at).toLocaleString() : "",
    }));

    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "musika_profiles.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export: monthly growth PDF summary
  const exportMonthlyGrowthPDF = () => {
    const doc = new jsPDF();
    doc.text("Musika AI - Monthly Growth Summary", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const labels = monthlyGrowthBarData.labels || [];
    const values = monthlyGrowthBarData.datasets?.[0]?.data || [];
    const tableColumn = ["Month", "New Signups"];
    const tableRows = labels.map((m, i) => [m, values[i] ?? 0]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save("musika_monthly_growth_summary.pdf");
  };

  // ============================
  // Existing Export Functions
  // ============================
  const exportSongsCSV = () => {
    const csvData = songs.map((s) => ({
      Title: s.title,
      Artist: s.artist,
      Genre: s.genre || "N/A",
      Mood: s.mood_tag || "N/A",
      DateAdded: s.created_at
        ? new Date(s.created_at).toLocaleDateString()
        : "",
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
    const tableRows = activityLogs.map((log) => [
      String(log.action || "").toUpperCase(),
      log.song_title || "Unknown",
      log.performed_at ? new Date(log.performed_at).toLocaleString() : "",
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237] },
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
              <p className="text-secondary m-0">
                Platform summary, user insights, and visualization
              </p>
            </div>
            <button
              className="btn btn-outline-danger d-flex align-items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* Summary Cards */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #7C3AED",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(124, 58, 237, 0.2)" }}
                >
                  <Music2 size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{totalTracks}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Total Tracks
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #0EA5E9",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(14, 165, 233, 0.2)" }}
                >
                  <BarChart3 size={24} color="#0EA5E9" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{mostPlayedGenre}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Top Genre
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #F59E0B",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(245, 158, 11, 0.2)" }}
                >
                  <HardDrive size={24} color="#F59E0B" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{estimatedStorageMB} MB</h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Storage Used
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #EC4899",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(236, 72, 153, 0.2)" }}
                >
                  <ListMusic size={24} color="#EC4899" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{uniqueGenresCount}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Available Genres
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* NEW: User Insights & Analytics Summary + Exports */}
          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #7C3AED",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(124, 58, 237, 0.2)" }}
                >
                  <Users size={24} color="#7C3AED" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">{userSummary.totalUsers}</h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Total Users
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm d-flex align-items-center gap-3"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #0EA5E9",
                }}
              >
                <div
                  className="p-3 rounded-circle"
                  style={{ background: "rgba(14, 165, 233, 0.2)" }}
                >
                  <BarChart3 size={24} color="#0EA5E9" />
                </div>
                <div>
                  <h3 className="m-0 fw-bold">
                    {userSummary.avgAge === null
                      ? "N/A"
                      : userSummary.avgAge.toFixed(1)}
                  </h3>
                  <span className="text-secondary small text-uppercase fw-bold">
                    Average Age
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #F59E0B",
                }}
              >
                <h6 className="text-secondary text-uppercase fw-bold mb-3">
                  Export Profiles (CSV)
                </h6>
                <button
                  className="btn btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={exportProfilesCSV}
                >
                  <Download size={16} /> Download CSV
                </button>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="p-4 rounded shadow-sm"
                style={{
                  background: "#1a1a24",
                  borderLeft: "4px solid #EC4899",
                }}
              >
                <h6 className="text-secondary text-uppercase fw-bold mb-3">
                  Export Monthly Growth (PDF)
                </h6>
                <button
                  className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={exportMonthlyGrowthPDF}
                >
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>
          </div>

          {/* NEW: Charts for user analytics */}
          <div className="row g-4 mb-5">
            <div className="col-lg-4">
              <div
                className="p-4 rounded shadow-sm h-100"
                style={{ background: "#1a1a24" }}
              >
                <h5 className="mb-4 text-white">
                  Growth Chart: New Signups / Month
                </h5>
                <div style={{ height: 280 }}>
                  <Bar data={monthlyGrowthBarData} options={chartOptions} />
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-4 rounded shadow-sm h-100"
                style={{ background: "#1a1a24" }}
              >
                <h5 className="mb-4 text-white">Age Distribution</h5>
                <div style={{ height: 280 }}>
                  <Bar data={ageDistributionData} options={chartOptions} />
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-4 rounded shadow-sm h-100"
                style={{ background: "#1a1a24" }}
              >
                <h5 className="mb-4 text-white">
                  Preference Pie: Top Favorite Genres
                </h5>
                <div style={{ width: "100%", height: 280, margin: "0 auto" }}>
                  <Doughnut data={preferencePieData} options={pieOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* NEW: Searchable Profiles Table */}
          <div className="row g-4 mb-5">
            <div className="col-12">
              <div
                className="p-4 rounded shadow-sm"
                style={{ background: "#1a1a24" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
                  <h5 className="m-0 text-white">User Insights & Analytics</h5>
                  <div className="position-relative">
                    <Search
                      size={16}
                      color="#9ca3af"
                      style={{ position: "absolute", left: 12, top: 10 }}
                    />
                    <input
                      className="form-control"
                      style={{
                        width: 320,
                        paddingLeft: 36,
                        background: "#2a2a36",
                        color: "#fff",
                        borderColor: "#374151",
                      }}
                      placeholder="Search username or email..."
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-secondary mb-3">
                  Showing <b>{filteredProfiles.length}</b> users (recently
                  updated first).
                </div>

                <div className="table-responsive" style={{ maxHeight: 420 }}>
                  <table className="table table-dark table-hover border-secondary">
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: "#1a1a24",
                      }}
                    >
                      <tr className="text-secondary small text-uppercase">
                        <th>Username</th>
                        <th>Email</th>
                        <th>Age</th>
                        <th>Favorite Genre(s)</th>
                        <th className="text-end">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProfiles.length > 0 ? (
                        filteredProfiles.slice(0, 200).map((p) => (
                          <tr key={p.id} className="align-middle">
                            <td className="text-white fw-bold">
                              {p.username || "N/A"}
                            </td>
                            <td className="text-secondary">
                              {p.email || "N/A"}
                            </td>
                            <td className="text-secondary">
                              {p.age === null || p.age === undefined
                                ? "N/A"
                                : p.age}
                            </td>
                            <td className="text-secondary">
                              {p.favorite_genre || "N/A"}
                            </td>
                            <td className="text-end text-secondary">
                              {p.updated_at
                                ? new Date(p.updated_at).toLocaleString()
                                : p.created_at
                                  ? new Date(p.created_at).toLocaleString()
                                  : "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="text-center py-4 text-secondary"
                          >
                            No profiles matched your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 text-secondary small">
                  Note: The table is capped at the first 200 results for
                  performance.
                </div>
              </div>
            </div>
          </div>

          {/* Existing Charts Row */}
          <div className="row g-4 mb-5">
            <div className="col-lg-8">
              <div
                className="p-4 rounded shadow-sm h-100"
                style={{ background: "#1a1a24" }}
              >
                <h5 className="mb-4 text-white">Uploads Per Month</h5>
                <div style={{ height: 300 }}>
                  <Bar data={processMonthlyUploads()} options={chartOptions} />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div
                className="p-4 rounded shadow-sm h-100 d-flex flex-column align-items-center"
                style={{ background: "#1a1a24" }}
              >
                <h5 className="mb-4 text-white w-100 text-start">
                  Artist Distribution
                </h5>
                <div style={{ width: 250, height: 250 }}>
                  <Doughnut
                    data={processArtistDistribution()}
                    options={pieOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Existing Activity Log */}
          <div className="row g-4">
            <div className="col-12">
              <div
                className="p-4 rounded shadow-sm"
                style={{ background: "#1a1a24" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="m-0 text-white">Transaction History</h5>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm text-white border-secondary d-flex align-items-center gap-2"
                      style={{
                        background: "#2a2a36",
                        opacity: songs.length ? 1 : 0.6,
                      }}
                      onClick={exportSongsCSV}
                      disabled={songs.length === 0}
                    >
                      <Download size={14} /> Export Songs CSV
                    </button>
                    <button
                      className="btn btn-sm text-white border-secondary d-flex align-items-center gap-2"
                      style={{
                        background: "#2a2a36",
                        opacity: activityLogs.length ? 1 : 0.6,
                      }}
                      onClick={exportActivityPDF}
                      disabled={activityLogs.length === 0}
                    >
                      <Download size={14} /> Export Log PDF
                    </button>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: 400 }}>
                  <table className="table table-dark table-hover border-secondary">
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: "#1a1a24",
                      }}
                    >
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
                              <span
                                className={`badge ${
                                  log.action === "upload"
                                    ? "bg-info text-dark"
                                    : "bg-danger"
                                } px-3 py-2 rounded-pill`}
                              >
                                {String(log.action || "").toUpperCase()}
                              </span>
                            </td>
                            <td className="text-white fw-bold">
                              {log.song_title || "Unknown"}
                            </td>
                            <td className="text-secondary text-end">
                              {log.performed_at
                                ? new Date(log.performed_at).toLocaleString()
                                : "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="3"
                            className="text-center py-4 text-secondary"
                          >
                            No activity logs found.
                          </td>
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
