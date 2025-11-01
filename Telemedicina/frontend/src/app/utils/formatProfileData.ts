export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '';

  let cleaned = phone.replace(/\s|-/g, '');

  if (cleaned.startsWith('06')) {
    cleaned = '+36' + cleaned.slice(2);
  }

  if (/^\+36\d{8,9}$/.test(cleaned)) {
    const part1 = cleaned.slice(0, 3);
    const part2 = cleaned.slice(3, 5);
    const part3 = cleaned.slice(5, 8);
    const part4 = cleaned.slice(8);
    return `${part1} ${part2} ${part3} ${part4}`;
  }

  return phone;
}


export function getAge(birthDateString?: string | null | undefined): number | null {
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


export function formatAppointmentTime(from: string, to: string): string {
  const yyyy = from.slice(0, 4);
  const mm   = from.slice(5, 7);
  const dd   = from.slice(8, 10);

  const fromHour = from.slice(11, 13);
  const fromMin  = from.slice(14, 16);

  const toHour = to.slice(11, 13);
  const toMin  = to.slice(14, 16);

  return `${yyyy}.${mm}.${dd}. ${fromHour}:${fromMin} - ${toHour}:${toMin}`;
}
