"use client";

/**
 * Last-resort error page, used only if the root layout itself fails. It renders its own
 * <html>, so app styles and fonts aren't available; styles are inline.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fcf9f2",
          color: "#1f2a3a",
          fontFamily: "system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <title>Something went wrong · subBruinLease</title>
        <div>
          <h1 style={{ color: "#3166ab", fontSize: 32, margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ color: "#5b6478", margin: "0 0 24px" }}>subBruinLease hit a problem loading. Please try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#3166ab",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
