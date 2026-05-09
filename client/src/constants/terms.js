/** Public folder PDF shown on signup (scroll-to-accept). */
export function getTermsPdfUrl() {
  return `${process.env.PUBLIC_URL || ''}/terms.pdf`;
}
