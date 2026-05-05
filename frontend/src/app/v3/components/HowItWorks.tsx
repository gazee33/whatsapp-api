import { FileText, MessageSquare, TrendingUp } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <MessageSquare className="w-8 h-8 text-emerald-600" />,
      title: "اربط حساب واتساب",
      description: "قم بتوصيل رقم الواتساب الخاص بعملك بمنصة Nadil AI بضغطة زر وبدون أي تعقيدات تقنية.",
      bg: "bg-emerald-100",
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      title: "درّب وكيلك الذكي",
      description: "ارفع روابط موقعك الإلكتروني أو ملفات الـ PDF الخاصة بمنتجاتك وسيتعلم الذكاء الاصطناعي كل شيء في ثوانٍ.",
      bg: "bg-blue-100",
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-600" />,
      title: "شاهد نمو مبيعاتك",
      description: "أطلق الوكيل للرد على عملائك، حل مشاكلهم، وإتمام عمليات البيع تلقائياً على مدار الساعة.",
      bg: "bg-purple-100",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            كيف يعمل Nadil AI؟
          </h2>
          <p className="text-lg text-slate-600">
            ثلاث خطوات بسيطة تفصلك عن أتمتة خدمة عملائك بالكامل وبدء استقبال الطلبات آلياً.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center mb-6`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                <span className="text-slate-300 me-2">{index + 1}.</span>
                {step.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}