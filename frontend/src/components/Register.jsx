import React, { useState } from "react";
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
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    // Validation for non-negative age
    if (form.age < 0) {
      alert("Age cannot be a negative value.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Ciphers do not match!");
      return;
    }

    // Proceed with registration
    navigate("/login");
  };

  return (
    <div className="auth-page-wrapper">
      <div className="container-fluid">
        <div className="row g-0">
          <div className="col-md-6 d-flex flex-column justify-content-center align-items-center text-center p-5">
            <h1 className="mana-title display-4">ETCH SOUL</h1>
            <p className="text-white opacity-75 font-italic mt-3">
              "Define your essence within the archive."
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
                      onKeyDown={(e) =>
                        ["e", "E", "-", "+"].includes(e.key) &&
                        e.preventDefault()
                      }
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
                  <select
                    className="form-select musika-input"
                    style={{ color: "var(--mana-silver)" }}
                    onChange={(e) =>
                      setForm({ ...form, genre: e.target.value })
                    }
                    required
                  >
                    <option value="" disabled selected hidden>
                      PRIMARY GENRE (AFFINITY)
                    </option>
                    <option value="lofi" style={{ background: "#1a1b26" }}>
                      Lofi / Chill
                    </option>
                    <option value="classical" style={{ background: "#1a1b26" }}>
                      Classical
                    </option>
                    <option value="synthwave" style={{ background: "#1a1b26" }}>
                      Synthwave
                    </option>
                    <option value="jazz" style={{ background: "#1a1b26" }}>
                      Jazz
                    </option>
                    <option value="ambient" style={{ background: "#1a1b26" }}>
                      Ambient
                    </option>
                  </select>
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
                  INITIATE CONTRACT
                </button>
              </form>
              <Link
                to="/login"
                className="mt-4 text-center small text-white-50 text-decoration-none"
              >
                Existing record? Access.
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
