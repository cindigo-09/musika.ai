import React from "react";

export default function Home() {
  return (
    <div className="container py-5">
      <header className="d-flex justify-content-between mb-5">
        <h3
          className="page-title display-4"
          style={{ fontFamily: "Space Mono" }}
        >
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
          <div className="card musika-card p-3 h-100">
            <h5 className="text-white opacity-75 font-italic">🤖 AI DJ</h5>
            <p className="text-white opacity-75 font-italic">
              What's your vibe right now?
            </p>
            <textarea
              className="form-control musika-input mb-3"
              rows="3"
              placeholder="Describe a mood you have today..."
            ></textarea>
            <button className="btn musika-btn w-100 text-white border border-secondary rounded font-italic">
              GENERATE QUEUE
            </button>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card musika-card p-4 mb-4 text-white opacity-75 font-italic">
            <h5>LIBRARY VIEW</h5>
            <div className="mt-4 text-center py-5 border border-secondary rounded ">
              <p className="text-white opacity-75 font-italic ">
                Music content powered by MUSIKA AI analyzing your mood...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
