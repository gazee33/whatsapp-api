/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import { MessageCircle, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 end-0 w-1/2 h-1/2 bg-emerald-100/50 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/4"></div>
      <div className="absolute bottom-0 start-0 w-1/3 h-1/3 bg-blue-100/50 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/4"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                الجيل الجديد من خدمة العملاء
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.2] mb-6">
                ردود أسرع، مبيعات أكثر عبر <span className="text-emerald-600">واتساب</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed">
                وكيلك الذكي يتفاعل مع عملائك على مدار الساعة، يجيب على استفساراتهم، ويعالج الطلبات فوراً لتتمكن من التركيز على تنمية أعمالك.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                  ابدأ مجاناً الآن
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center">
                  احجز عرضاً توضيحياً
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> لا يتطلب بطاقة ائتمان</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> إعداد في 5 دقائق</span>
              </div>
            </motion.div>
          </div>

          {/* Visual/Image Content */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 aspect-[4/5] md:aspect-square lg:aspect-[4/5] w-full max-w-lg mx-auto"
            >
              {/* Guy Image */}
              <img 
                src="https://media.istockphoto.com/id/2192933844/photo/young-saudi-businessman-using-mobile-phone-in-office-lobby.jpg?s=1024x1024&w=is&k=20&c=-Y1V8nS8y_L6tL7nO5jT_wR1yP0fB-XjYn6qB9-jQ=" 
                alt="Saudi businessman using mobile" 
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
            </motion.div>

            {/* Floating Chat Bubbles */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute top-12 -start-6 md:-start-12 bg-white p-4 rounded-2xl rounded-tr-none shadow-xl border border-slate-100 max-w-[240px]"
            >
              <p className="text-sm text-slate-700">السلام عليكم، متى أوقات الدوام؟ وهل فيه توصيل؟</p>
              <span className="text-[10px] text-slate-400 mt-2 block">العميل • 10:42 ص</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="absolute bottom-24 -end-6 md:-end-12 bg-emerald-600 p-4 rounded-2xl rounded-tl-none shadow-xl shadow-emerald-200 max-w-[260px]"
            >
              <p className="text-sm text-white">وعليكم السلام! نعم نوفر توصيل سريع 🚀 دوامنا من 8 ص إلى 11 م. هل أساعدك في رفع طلب؟</p>
              <span className="text-[10px] text-emerald-200 mt-2 block">Nadil AI • 10:42 ص</span>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}