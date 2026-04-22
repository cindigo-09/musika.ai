import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
// 1. Import the supabase client
import { supabase } from "../supabaseClient";

export default function Register() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load genres efficiently and handle possible errors gracefully
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { data, error } = await supabase.from('genres').select('genre_name');
        if (error) throw error;
        if (data) setGenres(data);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      }
    };
    fetchGenres();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    // Use FormData to prevent excessive React state re-renders on every keystroke
    const formData = new FormData(e.target);
    const username = formData.get("username");
    const age = parseInt(formData.get("age"));
    const email = formData.get("email");
    const genre = formData.get("genre");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (age < 0) return alert("Age cannot be negative.");
    if (password !== confirmPassword) return alert("Passwords do not match!");

    setLoading(true);

    try {
      // 2. Register the user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 3. Save extra info to our 'profiles' table
      if (data.user) {
        // 3. Save extra info to our 'profiles' table via backend
        const response = await fetch(`http://localhost:8080/api/user/${data.user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            age,
            favorite_genre: genre
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to save profile details");
        }
      }

      alert("Registration Complete! Check your email for a verification link.");
      navigate("/login");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          {/* Left Side: Brand Section */}
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="page-title display-4">MUSIKA AI</h1>
            <p className="text-white opacity-75 font-italic mt-3">
              "Define your mood within the notes of music."
            </p>
          </div>

          {/* Right Side: Form Section */}
          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <div className="card musika-card p-5" style={{ width: "480px" }}>
              <h3 className="mb-5 text-center" style={{ color: "var(--mana-gold)", letterSpacing: "4px" }}>
                REGISTER
              </h3>
              <form onSubmit={handleRegister}>
                <div className="row">
                  <div className="col-md-6 mb-4">
                    <input
                      type="text"
                      name="username"
                      placeholder="USERNAME"
                      className="form-control musika-input"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-4">
                    <input
                      type="number"
                      name="age"
                      placeholder="AGE"
                      className="form-control musika-input"
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="EMAIL"
                    className="form-control musika-input"
                    required
                  />
                </div>
                <div className="mb-4">
                  <input
                    list="genre-list"
                    name="genre"
                    placeholder="GENRE"
                    className="form-control musika-input"
                    required
                  />
                  <datalist id="genre-list">
                    {genres.map((g, i) => (
                      <option key={i} value={g.genre_name} />
                    ))}
                  </datalist>
                </div>
                <div className="mb-4">
                  <input
                    type="password"
                    name="password"
                    placeholder="CIPHER (PASSWORD)"
                    className="form-control musika-input"
                    required
                  />
                </div>
                <div className="mb-5">
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="CONFIRM CIPHER"
                    className="form-control musika-input"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-100 py-3"
                  style={{ border: "1px solid var(--mana-gold)", color: "var(--mana-gold)" }}
                >
                  {loading ? "Creating Account..." : "Register"}
                </button>
              </form>
              <Link to="/login" className="mt-4 text-center small text-white-50 text-decoration-none">
                Existing User? Login.
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}