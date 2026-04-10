import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    age: "",
    genre: "",
    password: "",
    confirmPassword: "",
  });
  const [genres, setGenres] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/genres")
      .then((res) => res.json())
      .then((data) => setGenres(data))
      .catch((err) => console.error("Could not load genres", err));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.age < 0) return alert("Age cannot be negative.");
    if (form.password !== form.confirmPassword)
      return alert("Passwords do not match!");

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        alert("Registration Complete!");
        navigate("/login");
      } else {
        alert("Registration failed.");
      }
    } catch (error) {
      console.error("Error:", error);
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
                      placeholder="USERNAME"
                      className="form-control musika-input"
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-4">
                    <input
                      type="number"
                      placeholder="AGE"
                      className="form-control musika-input"
                      min="0"
                      onChange={(e) =>
                        setForm({ ...form, age: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <input
                    type="email"
                    placeholder="EMAIL"
                    className="form-control musika-input"
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-4">
                  <input
                    list="genre-list"
                    placeholder="GENRE"
                    className="form-control musika-input"
                    onChange={(e) =>
                      setForm({ ...form, genre: e.target.value })
                    }
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
                    placeholder="CIPHER (PASSWORD)"
                    className="form-control musika-input"
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-5">
                  <input
                    type="password"
                    placeholder="CONFIRM CIPHER"
                    className="form-control musika-input"
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
                <button
                  className="btn w-100 py-3"
                  style={{
                    border: "1px solid var(--mana-gold)",
                    color: "var(--mana-gold)",
                  }}
                >
                  Register
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
