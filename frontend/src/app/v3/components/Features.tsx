/* eslint-disable @next/next/no-img-element */
import { Bot, Zap, ShieldCheck, RefreshCw } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            كل ما تحتاجه لأتمتة خدمة عملائك
          </h2>
          <p className="text-lg text-slate-600">
            أدوات متطورة مصممة خصيصاً للشركات لتسهيل التواصل وزيادة المبيعات عبر التطبيق الأكثر استخداماً في العالم.
          </p>
        </div>

        {/* Feature 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-12 mb-24">
          <div className="flex-1 lg:pe-12">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              وكيل ذكي يفهم لهجة عملائك
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              درب الذكاء الاصطناعي الخاص بك باستخدام بيانات موقعك أو ملفات الـ PDF. سيتعلم الوكيل تفاصيل منتجاتك وسياساتك ليجيب على الأسئلة بأسلوب احترافي وطبيعي.
            </p>
            <ul className="space-y-3">
              {[
                "دعم كامل للغة العربية واللهجات المحلية",
                "ردود فورية على مدار الساعة 24/7",
                "فهم السياق وتحليل نية العميل",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100 shadow-inner">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-700 font-bold">PDF</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">كتيب المنتجات.pdf</h4>
                    <p className="text-sm text-emerald-600">تم التدريب بنجاح</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 inline-block">كيفية استخدام المنتج؟</div>
                  <div className="bg-emerald-50 p-3 rounded-lg text-sm text-emerald-800 border border-emerald-100">
                    بناءً على دليل المنتجات، يتم استخدام المنتج عبر 3 خطوات بسيطة...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-12 mb-24">
          <div className="flex-1 lg:ps-12">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              البيع المباشر عبر المحادثة
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              حول المحادثات إلى مبيعات. يمكن للوكيل عرض المنتجات المناسبة، مشاركة روابط الدفع، وحتى إرسال عروض خاصة للعملاء المترددين في الشراء.
            </p>
            <ul className="space-y-3">
              {[
                "اقتراح منتجات بناءً على احتياج العميل",
                "إرسال تفاصيل الفاتورة وروابط الدفع",
                "استعادة سلات التسوق المتروكة",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100 shadow-inner relative overflow-hidden">
               {/* decorative */}
               <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-200 blur-3xl opacity-50 rounded-full"></div>
               <div className="relative bg-white rounded-2xl shadow-lg border border-slate-100 p-2 max-w-sm mx-auto">
                 <img 
                    src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop" 
                    alt="WhatsApp Chat" 
                    className="w-full rounded-xl object-cover h-64"
                 />
                 <div className="p-4">
                   <p className="text-sm font-bold text-slate-800 mb-1">عرض خاص لك! 🎉</p>
                   <p className="text-xs text-slate-500 mb-3">احصل على خصم 15% عند الدفع الآن.</p>
                   <button className="w-full bg-emerald-500 text-white text-sm font-bold py-2 rounded-lg">
                     ادفع الآن
                   </button>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 lg:pe-12">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              تحويل سلس للموظف البشري
            </h3>
            <p className="text-lg text-slate-600 mb-6">
              عندما يواجه الذكاء الاصطناعي استفساراً معقداً أو يطلب العميل التحدث لموظف، يتم تحويل المحادثة فوراً إلى فريق الدعم الخاص بك مع سياق المحادثة بالكامل.
            </p>
          </div>
          <div className="flex-1 w-full">
             <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl text-white">
                <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="font-semibold">لوحة تحكم الوكيل</span>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">مباشر</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-800 p-3 rounded-lg text-sm border-s-4 border-emerald-500">
                    <p className="text-slate-300">&ldquo;أريد التحدث مع خدمة العملاء بخصوص شكوى&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-yellow-400">
                    <RefreshCw className="w-4 h-4" />
                    <span>تم تحويل المحادثة إلى: أحمد (قسم الشكاوى)</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </section>
  );
}