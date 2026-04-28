import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Register() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const navigate = useNavigate();

  // Load genres from the database
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        // FIXED: Using 'genre_name' to match your column update
        const { data, error } = await supabase
          .from("genres")
          .select("genre_name");

        if (error) throw error;
        if (data) setGenres(data);
      } catch (err) {
        console.error("Failed to fetch genres:", err);
      } finally {
        setLoadingGenres(false);
      }
    };
    fetchGenres();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const username = formData.get("username");
    const age = formData.get("age");
    const genre = formData.get("genre");

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
            age: age,
            genre: genre,
          },
        },
      });

      if (error) throw error;

      alert(
        "Registration successful! Check your email to confirm your account.",
      );
      navigate("/login");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="page-title display-4">MUSIKA AI</h1>
            <p className="text-white opacity-75 font-italic mt-3">
              "Define your mood within the notes of music."
            </p>
          </div>

          <div className="col-md-6 d-flex justify-content-center align-items-center">
            <div className="card musika-card p-5" style={{ width: "480px" }}>
              <h3
                className="mb-5 text-center"
                style={{ color: "var(--mana-gold)", letterSpacing: "4px" }}
              >
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
                    placeholder={
                      loadingGenres ? "Loading Genres..." : "SELECT GENRE"
                    }
                    className="form-control musika-input"
                    required
                    disabled={loadingGenres}
                    autoComplete="off"
                  />
                  {/* FIXED: Mapped to g.genre_name instead of g.name */}
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
                    placeholder="PASSWORD"
                    className="form-control musika-input"
                    required
                  />
                </div>
                <div className="mb-4">
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="CONFIRM PASSWORD"
                    className="form-control musika-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || loadingGenres}
                  className="btn w-100 py-3"
                  style={{
                    border: "1px solid var(--mana-gold)",
                    color: "var(--mana-gold)",
                  }}
                >
                  {loading ? "Creating Account..." : "REGISTER"}
                </button>
              </form>
              <Link
                to="/login"
                className="mt-4 text-center small text-white-50 text-decoration-none"
              >
                Existing User? Login.
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
