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
  LayoutDashboard,
  Database,
  TrendingUp,
} from "lucide-react";
import logo from "../assets/logo-musikaAI.svg";

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
import { jsPDF } from "jspdf";

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
      // 1. Fetch Songs
      const { data: songsData, error: songsErr } = await supabase
        .from("songs")
        .select("*");
      if (!songsErr) setSongs(songsData || []);

      // 2. Fetch Profiles (needed for mapping IDs to Usernames)
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("*");
      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p.username || p.email || "Unknown User";
        return acc;
      }, {});
      if (!profilesErr) setProfiles(profilesData || []);

      // 3. Fetch Activity Log (Uploads, Deletions, Edits)
      const { data: logData, error: logErr } = await supabase
        .from("activity_log")
        .select("*")
        .order("performed_at", { ascending: false });

      // Map to include usernames
      const activityEntries = (logData || []).map(log => ({
        id: log.id,
        action: log.action,
        user: profilesMap[log.user_id] || "Unknown",
        song_title: log.song_title || "Unknown Track",
        time: log.performed_at
      }));

      setActivityLogs(activityEntries);

      // 4. Fetch Listening History (Still needed for charts, but not for the Transaction table)
      const { data: historyData } = await supabase
        .from("listening_history")
        .select("*")
        .order("played_at", { ascending: false });
      
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
    if (!activityLogs || activityLogs.length === 0) {
      alert("No activity logs available to export.");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = 15;

      // Title
      doc.setFontSize(16);
      doc.text("Musika AI - Activity Log", margin, yPosition);
      yPosition += 10;

      // Generated date
      doc.setFontSize(10);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        margin,
        yPosition,
      );
      yPosition += 10;

      // Table headers
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      const colWidths = [40, 30, 70, 50];
      const headers = ["User", "Action", "Song Title", "Date & Time"];
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPosition);
        xPos += colWidths[i];
      });
      yPosition += 8;

      // Draw line under headers
      doc.setDrawColor(124, 58, 237);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Table rows
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      activityLogs.forEach((log) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 15;
        }

        const user = String(log.user || "N/A");
        const action = String(log.action || "").toUpperCase();
        const songTitle = log.song_title || "Unknown";
        const dateTime = log.time
          ? new Date(log.time).toLocaleString()
          : "N/A";

        xPos = margin;
        doc.text(user.substring(0, 20), xPos, yPosition);
        doc.text(action.substring(0, 15), xPos + colWidths[0], yPosition);
        doc.text(songTitle.substring(0, 40), xPos + colWidths[0] + colWidths[1], yPosition);
        doc.text(
          dateTime.substring(0, 25),
          xPos + colWidths[0] + colWidths[1] + colWidths[2],
          yPosition,
        );
        yPosition += 6;
      });

      doc.save("musika_activity_log.pdf");
      console.log(
        `PDF exported successfully with ${activityLogs.length} records`,
      );
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="vh-100 vw-100 d-flex align-items-center justify-content-center" style={{ background: '#050508' }}>
        <div className="text-center">
          <Loader2 className="animate-spin mb-3 text-warning" size={48} />
          <div className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: '2px' }}>Loading Console...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="vh-100 vw-100 d-flex flex-column text-white"
      style={{ background: "#050508", overflow: "hidden" }}
    >
      {/* Premium Admin Header */}
      <header 
        className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom border-secondary border-opacity-25"
        style={{ background: "rgba(13, 13, 20, 0.8)", backdropFilter: "blur(10px)", zIndex: 1000 }}
      >
        <div className="d-flex align-items-center gap-3">
          <img src={logo} alt="Logo" height="45" className="logo-coin-spin" />
          <div>
            <h4 className="m-0 fw-bold text-warning" style={{ letterSpacing: '2px' }}>MUSIKA.AI</h4>
            <span className="text-secondary small fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Management Console</span>
          </div>
        </div>
        
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex flex-column text-end d-none d-md-block">
            <span className="text-white small fw-bold">Admin Portal</span>
            <span className="text-secondary" style={{ fontSize: '0.75rem' }}></span>
          </div>
          <button
            className="btn btn-outline-danger btn-sm px-3 rounded-pill d-flex align-items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={14} /> <span className="small fw-bold">SIGN OUT</span>
          </button>
        </div>
      </header>

      <main className="flex-grow-1 overflow-auto custom-scrollbar p-4 p-md-5">
        <div className="container-fluid max-width-1400">
          {/* Welcome Header */}
          <div className="mb-5">
            <h2 className="display-6 fw-bold mb-1">
              Dashboard <span className="text-warning">Overview</span>
            </h2>
            <p className="text-secondary">Comprehensive analytics and platform management.</p>
          </div>

          {/* Metrics Grid */}
          <div className="row g-4 mb-5">
            {[
              { label: "Total Tracks", value: totalTracks, icon: Music2, color: "#7C3AED", sub: "Global Library" },
              { label: "Top Genre", value: mostPlayedGenre, icon: TrendingUp, color: "#0EA5E9", sub: "Most Streamed" },
              { label: "Total Users", value: userSummary.totalUsers, icon: Users, color: "#F59E0B", sub: "Community Size" },
              { label: "Storage Use", value: `${estimatedStorageMB} MB`, icon: Database, color: "#EC4899", sub: "System Capacity" },
            ].map((m, i) => (
              <div className="col-md-3" key={i}>
                <div className="musika-card h-100 p-4 d-flex align-items-center gap-3" style={{ background: "rgba(20, 20, 30, 0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="p-3 rounded-4" style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                    <m.icon size={24} style={{ color: m.color }} />
                  </div>
                  <div className="overflow-hidden">
                    <h3 
                      className="m-0 fw-bold text-truncate" 
                      title={m.value}
                      style={{ maxWidth: '100%' }}
                    >
                      {m.value}
                    </h3>
                    <div className="text-secondary small fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>{m.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="row g-4 mb-5">
            <div className="col-lg-8">
              <div className="musika-card p-4" style={{ background: "rgba(20, 20, 30, 0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="m-0 fw-bold">Platform Growth</h5>
                  <div className="text-secondary small">New Signups per Month</div>
                </div>
                <div style={{ height: 320 }}>
                  <Bar data={monthlyGrowthBarData} options={chartOptions} />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="musika-card p-4 h-100" style={{ background: "rgba(20, 20, 30, 0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h5 className="mb-4 fw-bold">User Demographics</h5>
                <div style={{ height: 320 }}>
                  <Bar data={ageDistributionData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* User Management Section */}
          <div className="musika-card mb-5" style={{ background: "rgba(20, 20, 30, 0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="p-4 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center gap-3 flex-wrap">
              <h5 className="m-0 fw-bold d-flex align-items-center gap-2">
                <Users size={20} className="text-warning" /> User Insights
              </h5>
              <div className="d-flex gap-3">
                <div className="position-relative">
                  <Search size={16} className="text-secondary position-absolute" style={{ left: 12, top: 12 }} />
                  <input
                    className="form-control ps-5 rounded-pill border-secondary border-opacity-25"
                    style={{ width: 300, background: "rgba(0,0,0,0.2)", color: "#fff" }}
                    placeholder="Search users..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-warning btn-sm px-4 rounded-pill fw-bold" onClick={exportProfilesCSV}>
                  <Download size={14} className="me-2" /> EXPORT CSV
                </button>
              </div>
            </div>
            <div className="table-responsive" style={{ maxHeight: 400 }}>
              <table className="table table-dark table-hover mb-0">
                <thead className="small text-uppercase text-secondary">
                  <tr>
                    <th className="ps-4 border-0">Username</th>
                    <th className="border-0">Email</th>
                    <th className="border-0">Age</th>
                    <th className="border-0">Favorite Genre</th>
                    <th className="text-end pe-4 border-0">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.slice(0, 50).map(p => (
                    <tr key={p.id} className="align-middle">
                      <td className="ps-4 fw-bold text-white py-3 text-truncate" style={{ maxWidth: '150px' }} title={p.username || "N/A"}>
                        {p.username || "N/A"}
                      </td>
                      <td className="text-secondary text-truncate" style={{ maxWidth: '200px' }} title={p.email}>
                        {p.email}
                      </td>
                      <td className="text-secondary">{p.age || "N/A"}</td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-25 text-white fw-normal rounded-pill px-3 py-2">
                          {p.favorite_genre || "None"}
                        </span>
                      </td>
                      <td className="text-end pe-4 text-secondary small">
                        {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction History Section */}
          <div className="musika-card mb-5" style={{ background: "rgba(20, 20, 30, 0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="p-4 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
              <h5 className="m-0 fw-bold d-flex align-items-center gap-2">
                <ListMusic size={20} className="text-warning" /> Transaction History
              </h5>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={exportSongsCSV}>
                  <Download size={14} className="me-2" /> Songs CSV
                </button>
                <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={exportActivityPDF}>
                  <Download size={14} className="me-2" /> Activity PDF
                </button>
              </div>
            </div>
            <div className="table-responsive" style={{ maxHeight: 450 }}>
              <table className="table table-dark table-hover mb-0">
                <thead className="small text-uppercase text-secondary">
                  <tr>
                    <th className="ps-4 border-0">User</th>
                    <th className="border-0">Action</th>
                    <th className="border-0">Target Song</th>
                    <th className="text-end pe-4 border-0">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map(log => (
                    <tr key={log.id} className="align-middle">
                      <td className="ps-4 text-secondary py-3 text-truncate" style={{ maxWidth: '120px' }} title={log.user}>
                        {log.user}
                      </td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-2 ${
                          log.action === 'upload' ? 'bg-info text-dark' : 
                          log.action === 'edit' ? 'bg-warning text-dark' : 'bg-danger'
                        }`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-white fw-bold text-truncate" style={{ maxWidth: '250px' }} title={log.song_title}>
                        {log.song_title}
                      </td>
                      <td className="text-end pe-4 text-secondary small">
                        {new Date(log.time).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
