// Somaiya mark used across the app and embedded (base64 data URI) into
// exported PDF / Word documents so the header renders without network access.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 72">
  <rect width="260" height="72" fill="none"/>
  <g>
    <circle cx="34" cy="36" r="28" fill="#7B1416"/>
    <path d="M34 14 L41 30 L58 31 L45 42 L49 59 L34 50 L19 59 L23 42 L10 31 L27 30 Z" fill="#E8A33D"/>
  </g>
  <text x="76" y="33" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#7B1416">SOMAIYA</text>
  <text x="77" y="54" font-family="Helvetica, Arial, sans-serif" font-size="13" letter-spacing="2.4" fill="#4A3B33">VIDYAVIHAR UNIVERSITY</text>
</svg>`;

function encode(svg: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(svg)));
  }
  return Buffer.from(svg, "utf-8").toString("base64");
}

export const SOMAIYA_LOGO_DATA_URI = `data:image/svg+xml;base64,${encode(LOGO_SVG)}`;

export const APP_NAME = "Paper Path";
export const APP_TAGLINE = "Question paper design, review and release";
