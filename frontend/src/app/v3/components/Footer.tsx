import Link from "next/link";
import { Mail, Globe, MessageCircle, Share2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">N</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">Nadil AI</span>
            </div>
            <p className="text-slate-400 mb-6 leading-relaxed text-sm">
              أتمتة خدمة العملاء والمبيعات عبر واتساب باستخدام أحدث تقنيات الذكاء الاصطناعي.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                <Share2 className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">المنتج</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#features" className="hover:text-emerald-400 transition-colors">المميزات</Link></li>
              <li><Link href="#pricing" className="hover:text-emerald-400 transition-colors">الباقات والأسعار</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">تكامل واتساب</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">تحديثات المنصة</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">الموارد</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">مركز المساعدة</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">دليل الاستخدام</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">المدونة</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">دراسات حالة</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">قانوني</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">شروط الخدمة</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">سياسة الخصوصية</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">اتفاقية مستوى الخدمة</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Nadil AI. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Mail className="w-4 h-4" />
            <span>hello@nadil.ai</span>
          </div>
        </div>
      </div>
    </footer>
  );
}