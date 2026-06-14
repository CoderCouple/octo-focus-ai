const sidebarItems = [
  { label: "Home", icon: "H" },
  { label: "Notes", icon: "N" },
  { label: "Canvas", icon: "C" },
  { label: "Agents", icon: "A" },
  { label: "Graph", icon: "G" },
  { label: "Search", icon: "S" },
];

export default function HomePage() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <div className="brand-title">Octo</div>
            <div className="muted tiny">Human + AI workspace</div>
          </div>
        </div>

        <nav className="nav">
          {sidebarItems.map((item) => (
            <button key={item.label} className="nav-button">
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Product Workspace</h1>
            <p className="muted tiny">Notes, diagrams, and agent edits in one place.</p>
          </div>
          <button className="primary-button">New page</button>
        </header>

        <div className="split">
          <section className="note">
            <div className="row">
              <h2 className="section-heading">Note</h2>
              <button className="secondary-button">Ask Octo</button>
            </div>
            <h3 className="note-title">System architecture draft</h3>
            <div className="note-copy">
              <p>
                Octo stores structured notes and editable canvases in the same project. AI actions
                create semantic diagram schemas before rendering editable canvas shapes.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Write rough product notes.</li>
                <li>Generate diagrams from selected text.</li>
                <li>Let agents propose safe, auditable updates.</li>
              </ul>
            </div>
          </section>

          <section className="canvas">
            <div className="grid-bg" />
            <div className="canvas-inner">
              <div className="row">
                <h2 className="section-heading">Canvas</h2>
                <button className="secondary-button">Generate diagram</button>
              </div>

              <div className="canvas-stage">
                {["Note text", "Octo diagram schema", "Editable canvas"].map((label, index) => (
                  <div
                    key={label}
                    className="canvas-card"
                    style={{ left: index * 230, top: index % 2 === 0 ? 80 : 190 }}
                  >
                    <div className="card-title">{label}</div>
                    <p className="card-copy">
                      {index === 0
                        ? "Human-readable source."
                        : index === 1
                          ? "AI-safe structure."
                          : "Human-editable result."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
