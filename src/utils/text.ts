export function cleanText(value: string | null | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

export function normalizeIdentityPart(value: string | null | undefined): string {
  return cleanText(value)?.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "";
}

export function parseFirstInteger(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\d+/);
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseMoney(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/(?:USD\s*)?\$?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}
