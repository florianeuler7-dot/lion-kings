// Strip markdown leftovers and long dashes from coach text while it streams in.
// Keep in sync with cleanCoachText in netlify/functions/coach-chat.mjs.
export function cleanCoachText(s) {
  return String(s || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\n)[ \t]{0,3}#{1,6}[ \t]+/g, '$1')
    .replace(/(^|\n)[ \t]*[*•][ \t]+/g, '$1- ')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?=[^*\w]|$)/g, '$1$2')
    .replace(/\*\*/g, '')
    .replace(/[ \t][–—][ \t]/g, ', ')
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
