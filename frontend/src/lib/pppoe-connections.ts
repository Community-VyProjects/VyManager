export function connectionLineMatchesIp(line: string, ip: string): boolean {
  const escaped = ip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(:|\\s|$)`).test(line);
}
