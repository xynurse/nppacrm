// Stand-in Google Fonts responses for `pnpm build:offline`.
//
// Sandboxed environments (Claude Code on the web, some CI runners) can't reach
// fonts.googleapis.com, so `next/font/google` fails the build before any of our
// code is compiled. Next reads NEXT_FONT_GOOGLE_MOCKED_RESPONSES and uses this
// map instead of the network. The CSS is a placeholder: use this only to verify
// that the app compiles, never to produce a build you deploy.
const css = (family) =>
  `@font-face{font-family:'${family}';font-style:normal;font-weight:200 800;` +
  `src:url(https://fonts.gstatic.com/placeholder.woff2) format('woff2');}`;

module.exports = new Proxy(
  {},
  {
    get: (_, url) => {
      const match = /family=([^:&]+)/.exec(String(url));
      return css(match ? decodeURIComponent(match[1]).replace(/\+/g, " ") : "Fallback");
    },
    has: () => true,
  },
);
