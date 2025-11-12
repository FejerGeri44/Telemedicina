export const TEXT_PATTERN = /^[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ0-9.,\s\-\/]*$/;

export const PHONE_PATTERN = /^\+?[0-9\s\(\)\-\/]*$/;

export const TAJ_PATTERN = /^[0-9]{9}$/;

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export function containsForbiddenChars(input: string): boolean {
  if (!input) return false;
  const forbiddenPatterns = [
    /<script/i,
    /onload=/i,
    /javascript:/i,
    /alert\(/i,
  ];
  return forbiddenPatterns.some(pattern => pattern.test(input));
}
