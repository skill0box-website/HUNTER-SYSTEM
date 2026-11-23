
import { useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  const {
    headNodes,
    bodyNodes,
    htmlAttributes,
    bodyAttributes,
  } = useServerDocumentContext();

  return (
    <html lang="fr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>Hunter System</title>
        <meta name="theme-color" content="#101116" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Hunter System" />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        {headNodes}
      </head>

      <body {...bodyAttributes}>
        {children}
        {bodyNodes}

        <script
          dangerouslySetInnerHTML={{
            __html: `
           if (
  "serviceWorker" in navigator &&
  location.hostname !== "localhost" &&
  location.hostname !== "127.0.0.1"
) {
                const registerServiceWorker = () => {
                  navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                      console.log(
                        "Hunter System Service Worker actif :",
                        registration.scope
                      );
                    })
                    .catch((error) => {
                      console.error(
                        "Erreur Service Worker :",
                        error
                      );
                    });
                };

                if (document.readyState === "complete") {
                  registerServiceWorker();
                } else {
                  window.addEventListener(
                    "load",
                    registerServiceWorker,
                    { once: true }
                  );
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
