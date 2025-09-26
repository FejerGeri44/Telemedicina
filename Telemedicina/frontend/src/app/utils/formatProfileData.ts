export function formatPhoneNumber(phone?: string): string {
  if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
  return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}

export function getAge(birthDateString?: string): number | null {
  if (!birthDateString) return null;
  const today = new Date();
  const birth = new Date(birthDateString);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatTaj(taj?: string | number): string {
  if (!taj) return 'N/A';
  const clean = String(taj).replace(/\D/g, '');
  return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}
