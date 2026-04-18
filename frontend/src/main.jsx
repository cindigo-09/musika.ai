import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { MusicProvider } from "./context/MusicContext";
import "./index.css";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MusicProvider>
      <App />
    </MusicProvider>
  </React.StrictMode>,
);