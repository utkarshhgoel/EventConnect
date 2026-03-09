export interface ParsedDescription {
  text: string;
  facilities: string[];
}

export const parseDescription = (desc: string | undefined | null): ParsedDescription => {
  if (!desc) return { text: '', facilities: [] };
  try {
    const parsed = JSON.parse(desc);
    if (parsed && typeof parsed === 'object' && 'text' in parsed) {
      return {
        text: parsed.text || '',
        facilities: Array.isArray(parsed.facilities) ? parsed.facilities : []
      };
    }
  } catch (e) {
    // Not a JSON string, treat as plain text
  }
  return { text: desc, facilities: [] };
};

export const stringifyDescription = (text: string, facilities: string[]): string => {
  return JSON.stringify({ text, facilities });
};
