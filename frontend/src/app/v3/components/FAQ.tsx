"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "هل أحتاج لخبرة برمجية لاستخدام Nadil AI؟",
    answer: "لا أبداً. المنصة مصممة لتكون سهلة الاستخدام وتعمل بخاصية السحب والإفلات. كل ما عليك فعله هو ربط حسابك ورفع ملفاتك، وسيقوم الذكاء الاصطناعي بالباقي.",
  },
  {
    question: "هل يمكن للوكيل الذكي التحدث باللهجة العامية السعودية؟",
    answer: "نعم! النماذج التي نستخدمها مدربة على فهم اللغة العربية الفصحى بالإضافة إلى مختلف اللهجات المحلية بما فيها اللهجة السعودية لضمان تواصل طبيعي مع عملائك.",
  },
  {
    question: "ماذا يحدث إذا لم يعرف الذكاء الاصطناعي الإجابة؟",
    answer: "في حال واجه الوكيل سؤالاً خارج نطاق تدريبه أو طلب العميل التحدث لموظف بشري، سيقوم النظام تلقائياً بتحويل المحادثة إلى فريق الدعم الخاص بك مع كامل السجل.",
  },
  {
    question: "هل يمكنني ربط Nadil AI بمتجري الإلكتروني؟",
    answer: "نعم، نوفر ربطاً سهلاً مع أشهر منصات التجارة الإلكترونية مثل سلة وزد وShopify للرد على استفسارات الطلبات وتتبع الشحنات.",
  },
  {
    question: "كم تكلفة الخدمة؟",
    answer: "نوفر باقات مرنة تبدأ من الباقة المجانية للتجربة، وباقات مدفوعة تعتمد على حجم المحادثات وعدد الوكلاء. يمكنك الاطلاع على صفحة الباقات للتفاصيل.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            الأسئلة الشائعة
          </h2>
          <p className="text-lg text-slate-600">
            كل ما تحتاج معرفته عن منصة Nadil AI.
          </p>
        </div>

        <Accordion.Root type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <Accordion.Item
              key={index}
              value={`item-${index}`}
              className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-opacity-50"
            >
              <Accordion.Header className="flex">
                <Accordion.Trigger className="group flex flex-1 items-center justify-between py-5 px-6 text-start text-lg font-semibold text-slate-900 outline-none transition-colors hover:text-emerald-600">
                  {faq.question}
                  <ChevronDown
                    className="text-slate-400 transition-transform duration-300 ease-[cubic-bezier(0.87,_0,_0.13,_1)] group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-slate-600 data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                <div className="px-6 pb-5 pt-0 leading-relaxed">
                  {faq.answer}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}