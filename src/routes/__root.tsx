import { createRootRoute, HeadContent, Outlet, Scripts, useMatches } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import sansLatin from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url";
import sansCyrillic from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-cyrillic-400-normal.woff2?url";
import monoLatin from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";
import site from "@/lib/og/site.json";
import { DocumentLangProvider, useDocumentLang } from "@/components/document-lang";
import { LANG_KEY } from "@/lib/i18n";
import { langFromMatch } from "@/lib/i18n/resolve-lang";
import { useState, type ReactNode } from "react";

const SHARE_ORIGIN = site.url.replace(/\/+$/, "");
const SHARE_IMAGE = `${SHARE_ORIGIN}/og.jpg`;

const LANG_BOOT = `(function(){try{var k=${JSON.stringify(LANG_KEY)};var ls=localStorage.getItem(k);if(ls!=="en"&&ls!=="uk"&&ls!=="ru")return;var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));var cookie=m?decodeURIComponent(m[1]):"";if(cookie===ls)return;var secure=location.protocol==="https:"?"; Secure":"";document.cookie=k+"="+ls+"; Path=/; Max-Age=31536000; SameSite=Lax"+secure;}catch(e){}})();`;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function fontPreload(href: string) {
  return {
    rel: "preload" as const,
    href,
    as: "font" as const,
    type: "font/woff2",
    crossOrigin: "anonymous" as const,
  };
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: site.title },
      { name: "description", content: site.description },
      { name: "theme-color", content: `#${site.color}` },
      { property: "og:title", content: site.title },
      { property: "og:description", content: site.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SHARE_ORIGIN}/` },
      { property: "og:image", content: SHARE_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: site.title },
      { name: "twitter:description", content: site.description },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      fontPreload(sansLatin),
      fontPreload(sansCyrillic),
      fontPreload(monoLatin),
    ],
  }),
  component: Root,
});

function Root() {
  const matches = useMatches();
  const serverLang = langFromMatch(matches[matches.length - 1]);
  return (
    <DocumentLangProvider serverLang={serverLang}>
      <RootHtml />
    </DocumentLangProvider>
  );
}

function RootHtml() {
  const doc = useDocumentLang();
  const lang = doc?.lang ?? "en";
  return (
    <html lang={lang} className="antialiased">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body>
        <Providers>
          <Outlet />
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
