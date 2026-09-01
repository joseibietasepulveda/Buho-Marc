import React from "react";
import { createRoot } from "react-dom/client";
import BuhoAppPage from "../app/app/page";
import "../app/globals.css";

window.location.hash = "registrations";
createRoot(document.getElementById("root")!).render(<BuhoAppPage />);
