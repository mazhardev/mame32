export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div>
        <div className="spinner" aria-hidden="true" />
        <div className="small muted" style={{ marginTop: 12, textAlign: 'center' }}>
          {label}
        </div>
      </div>
    </div>
  );
}
