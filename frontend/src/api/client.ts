const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail || body?.message || `Request failed (${response.status})`);
  return body as T;
}

export type UploadResponse = { job_id: number; status: string };
export type JobResponse = { id: number; status: "queued" | "running" | "complete" | "failed"; progress: number; message: string };

export const api = {
  products: () => request<any[]>("/products"),
  analytics: (id: number) => request(`/products/${id}/analytics`),
  reviews: (id: number) => request(`/reviews?product_id=${id}`),
  statistics: (productId?: number) =>
    request<any>(productId ? `/statistics?product_id=${productId}` : "/statistics"),
  analyzeReview: (text: string, rating?: number | null) =>
    request<any>("/reviews/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, rating }),
    }),
  compare: (ids: number[]) =>
    request<any>("/products/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: ids }),
    }),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResponse>("/reviews/upload", { method: "POST", body: form });
  },
  job: (id: number) => request<JobResponse>(`/jobs/${id}`),
  chat: (productId: number, question: string) =>
    request<{ answer: string }>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, question }),
    }),
  assistantChat: (params: {
    productId: number;
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
    comparedProductId?: number;
    activeTab?: string;
  }) =>
    request<{
      answer: string;
      sources: string[];
      suggested_actions: string[];
      suggested_questions: string[];
      navigate_to_tab: string | null;
    }>("/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: params.productId,
        question: params.question,
        history: params.history || [],
        compared_product_id: params.comparedProductId,
        active_tab: params.activeTab,
      }),
    }),
};
