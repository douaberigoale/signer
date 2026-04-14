import { getSignatureUrl } from "../api/client";

interface Props {
  bust: number;
}

export default function SignaturePreview({ bust }: Props) {
  if (bust === 0) return null;

  return (
    <div>
      <p className="label" style={{ marginBottom: "0.5rem" }}>Current signature</p>
      <div style={{ border: "1px solid var(--c-border)", borderRadius: "var(--radius-md)", padding: "0.75rem", display: "inline-block", background: "var(--c-bg)" }}>
        <img
          src={getSignatureUrl(bust)}
          alt="Current signature"
          style={{ maxWidth: 280, maxHeight: 110, display: "block" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
        />
      </div>
    </div>
  );
}
