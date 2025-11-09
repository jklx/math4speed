export function padLeft(arr, total) {
  const missing = Math.max(0, total - arr.length);
  return Array(missing).fill(null).concat(arr);
}
