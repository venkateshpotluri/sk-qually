/**
 * Recognize "Name: rest of text" speaker prefixes in SRT and plaintext
 * transcripts. Conservative on purpose: a speaker label is short (at most
 * four words, 40 characters) and not itself a timestamp, so ordinary
 * sentences containing colons are not misread as speakers.
 */
export function splitSpeakerPrefix(raw: string): { speaker?: string; text: string } {
  const m = raw.match(/^([^:\n]{1,40}):\s+(\S[\s\S]*)$/);
  if (m) {
    const candidate = m[1]!.trim();
    const wordCount = candidate.split(/\s+/).length;
    const looksLikeTime = /\d{1,2}:\d{2}/.test(candidate) || /^\d+$/.test(candidate);
    if (wordCount <= 4 && !looksLikeTime) {
      return { speaker: candidate, text: m[2]!.trim() };
    }
  }
  return { text: raw.trim() };
}
