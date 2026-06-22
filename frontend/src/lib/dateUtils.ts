export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "Ahora mismo";
  if (m < 60)  return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `Hace ${d} día${d > 1 ? "s" : ""}`;
  const w = Math.floor(d / 7);
  if (w < 5)   return `Hace ${w} semana${w > 1 ? "s" : ""}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `Hace ${mo} mes${mo > 1 ? "es" : ""}`;
  return `Hace ${Math.floor(mo / 12)} año${Math.floor(mo / 12) > 1 ? "s" : ""}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatJoinedDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateEs(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}
