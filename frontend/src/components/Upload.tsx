import { ChangeEvent, useState } from "react";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";
import { api } from "../api/client";

type Props = { onComplete: () => Promise<void> | void };
const pause = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

export function Upload({ onComplete }: Props) {
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function pollJob(jobId: number) {
    while (true) {
      const job = await api.job(jobId);
      setProgress(job.progress);
      setMessage(`${job.progress}% · ${job.message}`);
      if (job.status === "complete") return;
      if (job.status === "failed") throw new Error(job.message || "Review analysis failed.");
      await pause(800);
    }
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploading) return;
    try {
      setIsUploading(true);
      setProgress(5);
      setMessage("Uploading & parsing review dataset…");
      const upload = await api.upload(file);
      if (!Number.isInteger(upload.job_id)) throw new Error("The server did not return a valid analysis job ID.");
      await pollJob(upload.job_id);
      setMessage("Finalizing AI diagnosis…");
      await onComplete();
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload could not be completed.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return (
    <label className="upload" aria-busy={isUploading}>
      {isUploading ? (
        <Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <UploadCloud size={18} />
      )}
      <span>{isUploading ? "AI Analyzing..." : "Import Review Dataset"}</span>
      <input type="file" accept=".csv,.zip" disabled={isUploading} onChange={choose} />
      {message && <em role="status">{message}</em>}
    </label>
  );
}
