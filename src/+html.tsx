
import {
  useServerDocumentContext,
} from "expo-router/html";

import type { PropsWithChildren } from "react";

export default function Root({
  children,
}: PropsWithChildren) {
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

        <meta
          name="theme-color"
          content="#101116"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta
          name="apple-mobile-web-app-title"
          content="Hunter"
        />

        <link
          rel="manifest"
          href="/manifest.json"
        />

        <link
          rel="apple-touch-icon"
          href="/hunter-192.png"
        />

        {headNodes}
      </head>

      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
