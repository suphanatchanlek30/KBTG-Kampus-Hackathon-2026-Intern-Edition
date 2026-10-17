
export function dealExpiry(moveInDate: string): string {
  const d = new Date(`${moveInDate}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + 2);
  const bkk = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  return `${bkk}T23:59:00+07:00`;
}
