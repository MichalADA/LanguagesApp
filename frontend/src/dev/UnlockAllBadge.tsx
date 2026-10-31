import { isUnlockAll, setUnlockAll } from "./unlockAll";

/** Widoczny znacznik trybu testowego — żeby nie zapomnieć, że wszystko jest odblokowane. */
export function UnlockAllBadge() {
  if (!isUnlockAll()) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", right: 12, bottom: 12, zIndex: 1000, display: "flex", gap: 10, alignItems: "center",
        padding: "6px 8px 6px 12px", borderRadius: 999, background: "#f2c14e", color: "#2c2321",
        font: "600 13px/1.2 system-ui, sans-serif", boxShadow: "0 2px 10px rgba(0,0,0,.35)",
      }}
    >
      Tryb testowy: wszystko odblokowane
      <button
        type="button"
        onClick={() => {
          setUnlockAll(false);
          window.location.reload();
        }}
        style={{ border: 0, borderRadius: 999, padding: "4px 10px", background: "#2c2321", color: "#f3ead8", font: "inherit", cursor: "pointer" }}
      >
        Wyłącz
      </button>
    </div>
  );
}
