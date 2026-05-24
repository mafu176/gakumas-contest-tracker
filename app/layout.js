import "./globals.css";

export const metadata = {
  title: "学マス コンテスト戦績トラッカー",
  description: "OCR・素点/プラス点・編成テンプレ対応版",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}