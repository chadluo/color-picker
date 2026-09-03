import { ColorPicker } from "color-selector";
import * as React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [value, setValue] = React.useState("oklch(70% 0.15 250)");

  return (
    <div
      style={{
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <h1 style={{ font: "600 18px system-ui" }}>(Wheel) Color Picker Demo</h1>
      <p>Scroll to change the hue</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ColorPicker value={value} onChange={setValue} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Color value"
          style={{ font: "inherit", width: 320, padding: 4 }}
        />
      </div>
      <div
        style={{
          width: 120,
          height: 60,
          borderRadius: 8,
          background: value,
          border: "1px solid #ccc",
        }}
      />
      <a href="https://github.com/chadluo/color-picker">Source</a>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
