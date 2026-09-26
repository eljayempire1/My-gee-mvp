import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Gee AI Companion",
  description: "Your AI companion and a place to discover real connections."
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          /* Keep Elijah OBONOGWU's saved profile portrait consistent everywhere. */
          img[src*="randomuser.me/api/portraits/men/13.jpg"] {
            content: url('/elijah-obonogwu-avatar.svg') !important;
          }
        `}</style>
      </head>
      <body style={{ margin: 0, background: "#09090b", color: "white" }}>
        {children}
      </body>
    </html>
  );
}
