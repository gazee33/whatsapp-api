import { Cairo } from "next/font/google";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata = {
  title: "Nadil AI | وكيلك الذكي على واتساب",
  description: "أتمتة خدمة العملاء والمبيعات عبر واتساب باستخدام الذكاء الاصطناعي",
};

export default function V3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="ar" dir="rtl" className={`light ${cairo.variable}`}>
      <body className="font-cairo bg-slate-50 text-slate-900 antialiased overflow-x-hidden selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </div>
  );
}