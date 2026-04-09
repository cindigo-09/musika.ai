import React from "react";

export default function Home() {
  return (
    <div className="container py-5">
      <header className="d-flex justify-content-between mb-5">
        <h3 style={{ color: "var(--accent)", fontFamily: "Space Mono" }}>
          MUSIKA.AI
        </h3>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = "/login";
          }}
          className="btn btn-outline-light btn-sm"
        >
          LOGOUT
        </button>
      </header>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card musika-card p-4 h-100">
            <h5 style={{ color: "var(--accent2)" }}>🤖 AI DJ</h5>
            <p className="small text-muted">What's your vibe right now?</p>
            <textarea
              className="form-control musika-input mb-3"
              rows="3"
              placeholder="Something chill for studying..."
            ></textarea>
            <button className="btn musika-btn w-100">GENERATE QUEUE</button>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card musika-card p-4 mb-4">
            <h5>LIBRARY VIEW</h5>
            <div className="mt-4 text-center py-5 border border-secondary rounded">
              <p className="text-muted">
                Music content powered by Claude AI analyzing your mood...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
