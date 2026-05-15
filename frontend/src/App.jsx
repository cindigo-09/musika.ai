import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Search from "./pages/Search";
import PublicProfile from "./pages/PublicProfile";
import Profile from "./pages/Profile";
import Playlists from "./pages/Playlists";
import PlaylistDetails from "./pages/PlaylistDetails"; // Ensure this is imported
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { MusicProvider } from "./context/MusicContext";
import { Toaster } from "react-hot-toast";
import ResetPassword from "./pages/ResetPassword";
import "./App.css";

function App() {
  return (
    <Router>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            border: '1px solid var(--mana-gold)',
          },
          success: {
            iconTheme: {
              primary: 'var(--mana-gold)',
              secondary: '#333',
            },
          },
        }}
      />
      <MusicProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/user/:id" element={<PublicProfile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlists/:id" element={<PlaylistDetails />} />
            <Route path="/admin" element={<Navigate to="/admin/login" />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Routes>
      </MusicProvider>
    </Router>
  );
}

export default App;
