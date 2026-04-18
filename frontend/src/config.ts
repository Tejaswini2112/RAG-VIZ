// In dev, VITE_API_URL is unset → empty string → Vite proxy handles /upload and /query.
// In production (Vercel), set VITE_API_URL to your Render backend URL.
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
