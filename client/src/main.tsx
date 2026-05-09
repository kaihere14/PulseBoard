/**
 * Vite entry. ClerkProvider wraps the app.
 * @see https://clerk.com/docs/react/reference/components/overview
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { App } from "./App";
import "./index.css";

const elem = document.getElementById("root");
if (!elem) {
  throw new Error('Missing root element with id "root"');
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  createRoot(elem).render(
    <p style={{ padding: "1rem", fontFamily: "system-ui" }}>
      Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>client/.env</code> (see{" "}
      <code>client/.env.example</code>), then restart <code>npm run dev</code>.
    </p>,
  );
} else {
  const app = (
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <App />
      </ClerkProvider>
    </StrictMode>
  );

  createRoot(elem).render(app);
}
