export type DetectedFile = { mime: string; bytes: number };

const SIGNATURES: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  // .docx is a ZIP container; .doc is an OLE compound file
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", test: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) },
  { mime: "application/msword", test: (b) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
];

/**
 * Decodes a base64 data URL and identifies its real type from the file's magic bytes.
 * The MIME type declared in the data URL (and by the client) is ignored.
 * Returns null when the payload isn't valid base64, exceeds maxBytes, or isn't an allowed type.
 */
export function inspectDataUrl(dataUrl: string, allowed: string[], maxBytes: number): DetectedFile | null {
  const match = /^data:[\w.+-]*\/?[\w.+-]*;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return null;
  if (Math.floor((match[1].length * 3) / 4) > maxBytes + 2) return null;
  const buf = Buffer.from(match[1], "base64");
  if (buf.length === 0 || buf.length > maxBytes) return null;
  const sig = SIGNATURES.find((s) => allowed.includes(s.mime) && s.test(buf));
  return sig ? { mime: sig.mime, bytes: buf.length } : null;
}
