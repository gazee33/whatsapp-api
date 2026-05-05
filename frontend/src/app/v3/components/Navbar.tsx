"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Nadil AI</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">المميزات</Link>
            <Link href="#how-it-works" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">كيف يعمل</Link>
            <Link href="#pricing" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">الباقات</Link>
            <Link href="#faq" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">الأسئلة الشائعة</Link>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 transition-colors">تسجيل الدخول</Link>
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm">
              ابدأ مجاناً
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600 hover:text-slate-900 focus:outline-none p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 shadow-lg absolute w-full">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link href="#features" onClick={() => setIsOpen(false)} className="block px-3 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">المميزات</Link>
            <Link href="#how-it-works" onClick={() => setIsOpen(false)} className="block px-3 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">كيف يعمل</Link>
            <Link href="#pricing" onClick={() => setIsOpen(false)} className="block px-3 py-3 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">الباقات</Link>
            <div className="pt-4 flex flex-col gap-3">
              <Link href="/login" className="block w-full text-center px-4 py-3 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl font-medium transition-colors">تسجيل الدخول</Link>
              <button className="w-full bg-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-md">ابدأ مجاناً</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}