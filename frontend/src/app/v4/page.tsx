"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import {
  MessageCircle,
  BarChart3,
  Globe,
  Shield,
  Zap,
  Sparkles,
  Phone,
  Menu,
  X,
  ArrowRight,
  Check,
  Star,
  UtensilsCrossed,
  Languages,
} from "lucide-react";

type Language = "en" | "ar";

const translations = {
  en: {
    nav: {
      features: "Features",
      demo: "Demo",
      pricing: "Pricing",
      signIn: "Sign In",
      tryFree: "Try Free",
    },
    hero: {
      badge: "The future concept for customer service",
      titlePre: "Your AI Waiter",
      titleHighlight: "That Never Sleeps",
      desc: "Nadil AI handles orders, bookings, and customer support on WhatsApp — in Arabic and English — 24 hours a day, 7 days a week.",
      ctaPrimary: "Try Now — It's Free",
      ctaSecondary: "View Demo",
      trust1: "No credit card required",
      trust2: "2-min setup",
    },
    featuresSection: {
      title: "Everything You Need to Automate",
      subtitle:
        "From taking orders to booking tables, Nadil handles it all — in your customers' language, on the app they already use.",
    },
    demoSection: {
      title: "See Nadil in Action",
      subtitle:
        "Experience how Nadil handles real restaurant conversations across ordering, booking, and support.",
      online: "Online • Replies instantly",
    },
    howItWorks: {
      title: "Get Started in Minutes",
      subtitle: "Three simple steps to automate your restaurant with AI.",
    },
    pricing: {
      title: "Simple, Transparent Pricing",
      subtitle: "Start free, upgrade when you need more. No hidden fees.",
      month: "/month",
      popular: "Most Popular",
    },
    ctaSection: {
      titlePre: "Ready to Hire Your",
      titleHighlight: "AI Waiter?",
      desc: "Join hundreds of restaurants using Nadil AI to automate orders, bookings, and support — all through WhatsApp.",
      primary: "Start Building Free",
      secondary: "Talk to Sales",
      footerNote: "No credit card required • Free forever plan available",
    },
    footer: {
      desc: "The AI waiter that never sleeps. Automate your restaurant orders, bookings, and support through WhatsApp.",
      systems: "All systems operational",
      product: "Product",
      resources: "Resources",
      company: "Company",
      features: "Features",
      pricing: "Pricing",
      demo: "Demo",
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about Nadil AI.",
      q1: "Does Nadil AI support Arabic dialects?",
      a1: "Yes! Nadil AI is built to understand Gulf, Levantine, Egyptian, and Modern Standard Arabic. It switches seamlessly between Arabic and English in the same conversation.",
      q2: "How long does setup take?",
      a2: "Most businesses are live in under 15 minutes. Link your WhatsApp account, upload your menu or FAQ, and you're ready to go.",
      q3: "Can Nadil AI handle complex orders?",
      a3: "Absolutely. Nadil AI handles customizations, add-ons, special requests, and multi-item orders. If it gets stuck, it escalates to a human seamlessly.",
      q4: "What channels does it work with?",
      a4: "Nadil AI works with WhatsApp Business, website chat widget, Instagram DM, and Facebook Messenger. All in one unified dashboard.",
      q5: "Is there a free trial?",
      a5: "Yes! Start with the free Starter plan — no credit card required. Upgrade to Pro when you need more conversations and advanced features.",
    },
    testimonials: {
      title: "Loved by Restaurants Like Yours",
      subtitle: "See what our customers say about Nadil AI.",
      t1: "Nadil AI transformed how we handle WhatsApp orders. We went from missing 30% of messages to 0. Our team loves it.",
      t1initials: "AR",
      t1role: "Owner, Shawarma House",
      t2: "The Arabic dialect understanding is incredible. Our customers feel like they're talking to a real person.",
      t2initials: "SN",
      t2role: "Manager, Al-Noor Cafe",
      t3: "Set up in under 10 minutes. The analytics dashboard alone saves us hours every week.",
      t3initials: "KO",
      t3role: "Founder, Digital Clinic",
    },
  },
  ar: {
    nav: {
      features: "المميزات",
      demo: "عرض توضيحي",
      pricing: "الأسعار",
      signIn: "تسجيل الدخول",
      tryFree: "جرب مجاناً",
    },
    hero: {
      badge: "مفهوم المستقبل لخدمة العملاء",
      titlePre: "مساعدك الذكي",
      titleHighlight: "الذي لا ينام أبداً",
      desc: "مساعدك الذكي يقوم بالرد على الطلبات، الحجوزات، وخدمة العملاء عبر واتساب — باللغتين العربية والإنجليزية — على مدار الساعة.",
      ctaPrimary: "جرب الآن — مجاناً",
      ctaSecondary: "مشاهدة العرض",
      trust1: "لا يلزم بطاقة ائتمان",
      trust2: "إعداد في دقيقتين",
    },
    featuresSection: {
      title: "كل ما تحتاجه للأتمتة",
      subtitle:
        "من تلقي الطلبات إلى حجز الطاولات، مساعدك الذكي يتولى كل شيء — بلغة عملائك، عبر التطبيق الذي يستخدمونه بالفعل.",
    },
    demoSection: {
      title: "شاهد مساعدك الذكي أثناء العمل",
      subtitle:
        "تجربة كيف يتعامل مساعدك الذكي مع المحادثات الحقيقية للمطاعم عبر الطلبات والحجوزات والدعم.",
      online: "متصل • يرد فوراً",
    },
    howItWorks: {
      title: "ابدأ في دقائق",
      subtitle: "ثلاث خطوات بسيطة لأتمتة مطعمك بالذكاء الاصطناعي.",
    },
    pricing: {
      title: "أسعار بسيطة وشفافة",
      subtitle:
        "ابدأ مجاناً، وقم بالترقية عندما تحتاج للمزيد. لا توجد رسوم خفية.",
      month: "/شهر",
      popular: "الأكثر شيوعاً",
    },
    ctaSection: {
      titlePre: "هل أنت مستعد لتوظيف",
      titleHighlight: "مساعدك الذكي؟",
      desc: "انضم إلى مئات المطاعم التي تستخدم مساعدك الذكي لأتمتة الطلبات والحجوزات والدعم — كل ذلك عبر واتساب.",
      primary: "ابدأ البناء مجاناً",
      secondary: "تحدث مع المبيعات",
      footerNote: "لا يلزم بطاقة ائتمان • تتوفر خطة مجانية للأبد",
    },
    footer: {
      desc: "النادل الآلي الذي لا ينام أبداً. أتمتة طلبات مطعمك وحجوزاته ودعمه عبر واتساب.",
      systems: "جميع الأنظمة تعمل بشكل طبيعي",
      product: "المنتج",
      resources: "المصادر",
      company: "الشركة",
      features: "المميزات",
      pricing: "الأسعار",
      demo: "عرض توضيحي",
      about: "عن نادل",
      contact: "اتصل بنا",
      privacy: "الخصوصية",
      terms: "الشروط",
    },
    faq: {
      title: "الأسئلة الشائعة",
      subtitle: "كل ما تحتاج معرفته عن مساعدك الذكي.",
      q1: "هل يدعم مساعدك الذكي اللهجات العربية؟",
      a1: "نعم! مساعدك الذكي مبني لفهم اللهجات الخليجية والشامية والمصرية والعربية الفصحى. ينتقل بسلاسة بين العربية والإنجليزية في نفس المحادثة.",
      q2: "كم يستغرق الإعداد؟",
      a2: "معظم الشركات تصبح متصلة في أقل من ١٥ دقيقة. اربط حساب واتساب، وارفع قائمتك أو أسئلتك الشائعة، وستكون جاهزاً.",
      q3: "هل يستطيع مساعدك الذكي التعامل مع الطلبات المعقدة؟",
      a3: "بالتأكيد. مساعدك الذكي يتعامل مع التخصيصات والإضافات والطلبات الخاصة والطلبات متعددة الأصناف. إذا تعثر، يحول للموظف البشري بسلاسة.",
      q4: "ما القنوات التي يعمل معها؟",
      a4: "مساعدك الذكي يعمل مع واتساب بزنس، وأداة دردشة الموقع، ورسائل إنستغرام، وفيسبوك ماسنجر. الكل في لوحة تحكم موحدة.",
      q5: "هل يوجد نسخة تجريبية مجانية؟",
      a5: "نعم! ابدأ بالباقة الأساسية المجانية — لا حاجة لبطاقة ائتمان. قم بالترقية إلى الاحترافية عندما تحتاج المزيد من المحادثات والمميزات.",
    },
    testimonials: {
      title: "محبوب من قبل مطاعم مثل مطعمك",
      subtitle: "شاهد ما يقوله عملاؤنا عن مساعدك الذكي.",
      t1: "مساعدك الذكي غير طريقة تعاملنا مع طلبات واتساب. انتقلنا من فقدان ٣٠٪ من الرسائل إلى صفر. فريقنا يحبه.",
      t1initials: "أح",
      t1role: "مالك، بيت الشاورما",
      t2: "فهم اللهجات العربية لا يُصدق. زبائننا يشعرون أنهم يتحدثون مع شخص حقيقي.",
      t2initials: "سن",
      t2role: "مديرة، مقهى النور",
      t3: "تم الإعداد في أقل من ١٠ دقائق. لوحة التحليلات وحدها توفر علينا ساعات كل أسبوع.",
      t3initials: "خا",
      t3role: "مؤسس، العيادة الرقمية",
    },
  },
};

const floatingMessages = {
  en: [
    {
      text: "I'd like to order 2 shawarma please 🥙",
      delay: 0,
      side: "right",
      type: "customer",
    },
    {
      text: "Sure! Would you like chicken or beef?",
      delay: 1.5,
      side: "left",
      type: "ai",
    },
    {
      text: "Chicken with extra garlic sauce!",
      delay: 3,
      side: "top-right",
      type: "customer",
    },
    {
      text: "Got it! That'll be ready in 15 min 🕐",
      delay: 4.5,
      side: "left",
      type: "ai",
    },
    {
      text: "أبغى أحجز طاولة لـ ٤ أشخاص",
      delay: 2,
      side: "bottom-right",
      type: "customer",
    },
    {
      text: "تم الحجز! طاولتك جاهزة الساعة ٨ مساءً",
      delay: 5.5,
      side: "bottom-left",
      type: "ai",
    },
  ],
  ar: [
    {
      text: "أريد طلب ٢ شاورما لو سمحت 🥙",
      delay: 0,
      side: "right",
      type: "customer",
    },
    {
      text: "بالتأكيد! هل تفضل الدجاج أم اللحم؟",
      delay: 1.5,
      side: "left",
      type: "ai",
    },
    {
      text: "دجاج مع ثوم إضافي!",
      delay: 3,
      side: "top-right",
      type: "customer",
    },
    {
      text: "تم! سيكون طلبك جاهزاً خلال ١٥ دقيقة 🕐",
      delay: 4.5,
      side: "left",
      type: "ai",
    },
    {
      text: "I want to book a table for 4",
      delay: 2,
      side: "bottom-right",
      type: "customer",
    },
    {
      text: "Confirmed! Your table is ready at 8 PM",
      delay: 5.5,
      side: "bottom-left",
      type: "ai",
    },
  ],
};

const features = {
  en: [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "WhatsApp-Native Ordering",
      desc: "Customers order directly through WhatsApp. No app downloads, no learning curve — just natural conversation.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Arabic Dialect Mastery",
      desc: "Understands Gulf, Levantine, Egyptian, and MSA. Your customers speak naturally, Nadil understands perfectly.",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Instant Kitchen Sync",
      desc: "Orders appear on your kitchen dashboard in real-time. Zero delay between conversation and confirmation.",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Multi-Model Intelligence",
      desc: "Powered by GPT-4 and Claude through a unified API. Smart routing for the best response every time.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Human Handoff",
      desc: "Complex queries automatically escalate to your team. Seamless transition from AI to human support.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Revenue Analytics",
      desc: "Track popular items, peak hours, and customer retention. Data-driven decisions for your restaurant.",
    },
  ],
  ar: [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "الطلب عبر واتساب",
      desc: "يطلب العملاء مباشرة عبر واتساب. لا حاجة لتحميل تطبيقات، لا منحنى تعلم — فقط محادثة طبيعية.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "إتقان اللهجات العربية",
      desc: "يفهم اللهجات الخليجية، الشامية، المصرية، والفصحى. عملاؤك يتحدثون بطبيعتهم، ومساعدك الذكي يفهمهم تماماً.",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "مزامنة فورية مع المطبخ",
      desc: "تظهر الطلبات على لوحة تحكم المطبخ في الوقت الفعلي. لا يوجد تأخير بين المحادثة والتأكيد.",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "ذكاء متعدد النماذج",
      desc: "مدعوم بـ GPT-4 و Claude عبر واجهة برمجة تطبيقات موحدة. توجيه ذكي لأفضل استجابة في كل مرة.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "التحويل للموظف",
      desc: "الاستفسارات المعقدة تتحول تلقائياً لفريقك. انتقال سلس من الذكاء الاصطناعي إلى الدعم البشري.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "تحليلات الإيرادات",
      desc: "تتبع الأصناف الشائعة، ساعات الذروة، ولاء العملاء. قرارات مبنية على البيانات لمطعمك.",
    },
  ],
};

const demoConversations = {
  en: [
    {
      id: "ordering",
      title: "Ordering",
      messages: [
        {
          role: "customer",
          text: "Hi! I want to order lunch for delivery",
          delay: 0,
        },
        {
          role: "ai",
          text: "Welcome! What would you like to order today? We have our full menu available.",
          delay: 0.8,
        },
        {
          role: "customer",
          text: "2 chicken shawarma wraps and a fattoush salad",
          delay: 1.6,
        },
        {
          role: "ai",
          text: "Great choice! That's 2 chicken shawarma wraps (SAR 44) and 1 fattoush salad (SAR 22). Your total is SAR 66. Would you like to add any drinks?",
          delay: 2.4,
        },
        {
          role: "customer",
          text: "Yes, add 2 fresh orange juices",
          delay: 3.2,
        },
        {
          role: "ai",
          text: "Added! New total: SAR 94. Your order will be ready in 25 minutes. We'll send you a confirmation shortly. Enjoy your meal! 🍽️",
          delay: 4,
        },
      ],
    },
    {
      id: "booking",
      title: "Booking",
      messages: [
        { role: "customer", text: "أريد حجز طاولة الليلة", delay: 0 },
        {
          role: "ai",
          text: "أهلاً وسهلاً! كم عدد الأشخاص؟ وفي أي وقت تفضل؟",
          delay: 0.8,
        },
        { role: "customer", text: "٦ أشخاص، الساعة ٩ مساءً", delay: 1.6 },
        {
          role: "ai",
          text: "تم! يوجد طاولة متاحة لـ ٦ أشخاص الساعة ٩ مساءً. الحجز باسم من؟",
          delay: 2.4,
        },
        { role: "customer", text: "محمد العلي", delay: 3 },
        {
          role: "ai",
          text: "تم تأكيد حجزك: ٦ أشخاص، الليلة الساعة ٩ مساءً، باسم محمد العلي. ننتظرك! 🌟",
          delay: 3.6,
        },
      ],
    },
    {
      id: "support",
      title: "Support",
      messages: [
        { role: "customer", text: "My order was missing an item", delay: 0 },
        {
          role: "ai",
          text: "I'm sorry about that! Let me check your order right away. Can you share your order number?",
          delay: 0.8,
        },
        { role: "customer", text: "It's #ORD-2847", delay: 1.6 },
        {
          role: "ai",
          text: "I can see your order #ORD-2847 — I'm connecting you with our support team now to resolve this immediately. They'll take care of you!",
          delay: 2.4,
        },
        {
          role: "system",
          text: "🔁 Connected to support agent Ahmed",
          delay: 3.2,
        },
      ],
    },
  ],
  ar: [
    {
      id: "ordering",
      title: "الطلبات",
      messages: [
        { role: "customer", text: "مرحباً! أريد طلب غداء للتوصيل", delay: 0 },
        {
          role: "ai",
          text: "أهلاً بك! ماذا تود أن تطلب اليوم؟ قائمتنا الكاملة متاحة لك.",
          delay: 0.8,
        },
        {
          role: "customer",
          text: "٢ ساندوتش شاورما دجاج وسلطة فتوش",
          delay: 1.6,
        },
        {
          role: "ai",
          text: "اختيار رائع! ٢ شاورما دجاج (٤٤ ر.س) و١ سلطة فتوش (٢٢ ر.س). المجموع ٦٦ ر.س. هل تود إضافة أي مشروبات؟",
          delay: 2.4,
        },
        { role: "customer", text: "نعم، أضف ٢ عصير برتقال طازج", delay: 3.2 },
        {
          role: "ai",
          text: "تمت الإضافة! المجموع الجديد: ٩٤ ر.س. سيكون طلبك جاهزاً خلال ٢٥ دقيقة. سنرسل لك تأكيداً قريباً. بالعافية! 🍽️",
          delay: 4,
        },
      ],
    },
    {
      id: "booking",
      title: "الحجوزات",
      messages: [
        { role: "customer", text: "أريد حجز طاولة الليلة", delay: 0 },
        {
          role: "ai",
          text: "أهلاً وسهلاً! كم عدد الأشخاص؟ وفي أي وقت تفضل؟",
          delay: 0.8,
        },
        { role: "customer", text: "٦ أشخاص، الساعة ٩ مساءً", delay: 1.6 },
        {
          role: "ai",
          text: "تم! يوجد طاولة متاحة لـ ٦ أشخاص الساعة ٩ مساءً. الحجز باسم من؟",
          delay: 2.4,
        },
        { role: "customer", text: "محمد العلي", delay: 3 },
        {
          role: "ai",
          text: "تم تأكيد حجزك: ٦ أشخاص، الليلة الساعة ٩ مساءً، باسم محمد العلي. ننتظرك! 🌟",
          delay: 3.6,
        },
      ],
    },
    {
      id: "support",
      title: "الدعم",
      messages: [
        { role: "customer", text: "طلبي ينقصه صنف", delay: 0 },
        {
          role: "ai",
          text: "نعتذر عن ذلك! سأتحقق من طلبك فوراً. هل يمكنك تزويدي برقم الطلب؟",
          delay: 0.8,
        },
        { role: "customer", text: "رقمه #ORD-2847", delay: 1.6 },
        {
          role: "ai",
          text: "أرى طلبك #ORD-2847 — سأقوم بتحويلك الآن لموظف الدعم لحل المشكلة فوراً. سيهتمون بك!",
          delay: 2.4,
        },
        { role: "system", text: "🔁 تم الاتصال بموظف الدعم أحمد", delay: 3.2 },
      ],
    },
  ],
};

const steps = {
  en: [
    {
      number: "01",
      title: "Connect WhatsApp",
      desc: "Link your business WhatsApp number in under 2 minutes. No technical setup required.",
      icon: <Phone className="w-5 h-5" />,
    },
    {
      number: "02",
      title: "Add Your Menu",
      desc: "Upload your menu items, prices, and categories. Nadil learns your offerings instantly.",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      number: "03",
      title: "Go Live",
      desc: "Your AI waiter starts taking orders 24/7. Monitor everything from your dashboard.",
      icon: <Zap className="w-5 h-5" />,
    },
  ],
  ar: [
    {
      number: "٠١",
      title: "ربط الواتساب",
      desc: "اربط رقم واتساب عملك في أقل من دقيقتين. لا يتطلب أي إعداد تقني.",
      icon: <Phone className="w-5 h-5" />,
    },
    {
      number: "٠٢",
      title: "أضف قائمتك",
      desc: "ارفع أصناف القائمة، الأسعار، والفئات. مساعدك الذكي يتعلم عروضك فوراً.",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      number: "٠٣",
      title: "انطلق مباشرة",
      desc: "مساعدك الآلي يبدأ في تلقي الطلبات على مدار الساعة. راقب كل شيء من لوحة التحكم.",
      icon: <Zap className="w-5 h-5" />,
    },
  ],
};

const plans = {
  en: [
    {
      name: "Starter",
      price: "Free",
      period: "month",
      desc: "For small restaurants testing the waters",
      features: [
        "100 conversations/month",
        "WhatsApp integration",
        "Basic menu management",
        "Email support",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Professional",
      price: "199",
      period: "month",
      desc: "For growing restaurants",
      features: [
        "Unlimited conversations",
        "Kitchen dashboard",
        "Arabic dialect support",
        "Booking system",
        "Analytics dashboard",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "For multi-location restaurants",
      features: [
        "Everything in Professional",
        "Custom AI fine-tuning",
        "Multi-location management",
        "Dedicated infrastructure",
        "SLA guarantee",
        "24/7 phone support",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ],
  ar: [
    {
      name: "المبتدئ",
      price: "٠",
      period: "شهر",
      desc: "للمطاعم الصغيرة التي تختبر الخدمة",
      features: [
        "١٠٠ محادثة/شهر",
        "تكامل واتساب",
        "إدارة القائمة الأساسية",
        "دعم عبر البريد",
      ],
      cta: "ابدأ مجاناً",
      highlighted: false,
    },
    {
      name: "الاحترافي",
      price: "١٩٩",
      period: "شهر",
      desc: "للمطاعم المتنامية",
      features: [
        "محادثات غير محدودة",
        "لوحة تحكم المطبخ",
        "دعم اللهجات العربية",
        "نظام الحجوزات",
        "لوحة تحكم التحليلات",
        "دعم ذو أولوية",
      ],
      cta: "ابدأ التجربة المجانية",
      highlighted: true,
    },
    {
      name: "الشركات",
      price: "مخصص",
      period: "",
      desc: "للمطاعم متعددة الفروع",
      features: [
        "كل ما في الاحترافي",
        "تخصيص الذكاء الاصطناعي",
        "إدارة فروع متعددة",
        "بنية تحتية مخصصة",
        "ضمان مستوى الخدمة",
        "دعم هاتفي ٢٤/٧",
      ],
      cta: "اتصل بالمبيعات",
      highlighted: false,
    },
  ],
};

export default function V4LandingPage() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("nadil-lang") as Language;
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading persisted preference from localStorage
      setLang(stored);
    }
  }, []);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ordering");
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const t = translations[lang];
  const isRtl = lang === "ar";
  const prefersReducedMotion = useReducedMotion();

  const shouldAnimate = !prefersReducedMotion;

  useEffect(() => {
    localStorage.setItem("nadil-lang", lang);
  }, [lang]);

  useEffect(() => {
    const conv = demoConversations[lang].find((c) => c.id === activeTab);
    if (!conv) return;
    const timeouts: NodeJS.Timeout[] = [];
    queueMicrotask(() => setVisibleMessages(0));
    conv.messages.forEach((_, i) => {
      const timeout = setTimeout(
        () => {
          setVisibleMessages((prev) => Math.max(prev, i + 1));
        },
        (conv.messages[i].delay || i * 0.8) * 1000 + 300,
      );
      timeouts.push(timeout);
    });
    return () => timeouts.forEach(clearTimeout);
  }, [activeTab, lang]);

  const currentConv = demoConversations[lang].find((c) => c.id === activeTab);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`min-h-screen bg-[#FAF5FF] text-[#1E1B4B] scroll-smooth ${isRtl ? "font-[family-name:var(--font-cairo)]" : "font-[family-name:var(--font-karla)]"} selection:bg-[#6366F1] selection:text-white overflow-x-hidden`}
    >
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#6366F1] opacity-[0.06] blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[#06B6D4] opacity-[0.04] blur-[150px]" />
        <div className="absolute top-[50%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#818CF8] opacity-[0.04] blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#FAF5FF]/80 backdrop-blur-xl border-b border-[#6366F1]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/v4"
              className="flex items-center gap-2.5 font-[family-name:var(--font-serif)] text-xl font-bold text-[#1E1B4B] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Nadil<span className="text-[#6366F1]">AI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a
                href="#features"
                className="text-[#1E1B4B]/60 hover:text-[#6366F1] transition-colors duration-200 cursor-pointer"
                aria-label={t.nav.features}
              >
                {t.nav.features}
              </a>
              <a
                href="#demo"
                className="text-[#1E1B4B]/60 hover:text-[#6366F1] transition-colors duration-200 cursor-pointer"
                aria-label={t.nav.demo}
              >
                {t.nav.demo}
              </a>
              <a
                href="#pricing"
                className="text-[#1E1B4B]/60 hover:text-[#6366F1] transition-colors duration-200 cursor-pointer"
                aria-label={t.nav.pricing}
              >
                {t.nav.pricing}
              </a>

              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1]/5 text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors cursor-pointer"
                aria-label={
                  lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"
                }
              >
                <Languages className="w-4 h-4" />
                <span className="text-xs font-bold">
                  {lang === "en" ? "العربية" : "English"}
                </span>
              </button>

              <Link
                href="/login"
                className="text-[#1E1B4B]/60 hover:text-[#6366F1] transition-colors duration-200 cursor-pointer"
                aria-label={t.nav.signIn}
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 bg-[#6366F1] text-white rounded-xl font-semibold hover:bg-[#4F46E5] transition-all duration-200 shadow-lg shadow-[#6366F1]/25 cursor-pointer"
              >
                {t.nav.tryFree}
              </Link>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setLang(lang === "en" ? "ar" : "en")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#6366F1]/5 text-[#6366F1] cursor-pointer"
                aria-label={`Switch to ${lang === "en" ? "Arabic" : "English"}`}
              >
                <Languages className="w-4 h-4" />
                <span className="text-xs font-bold">
                  {lang === "en" ? "عربي" : "EN"}
                </span>
              </button>
              <button
                className="p-2 rounded-lg hover:bg-[#6366F1]/5 transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#6366F1]/10 bg-[#FAF5FF]/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-4 space-y-3">
                <a
                  href="#features"
                  className="block py-2 text-[#1E1B4B]/70 hover:text-[#6366F1] transition-colors cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.features}
                </a>
                <a
                  href="#demo"
                  className="block py-2 text-[#1E1B4B]/70 hover:text-[#6366F1] transition-colors cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.demo}
                </a>
                <a
                  href="#pricing"
                  className="block py-2 text-[#1E1B4B]/70 hover:text-[#6366F1] transition-colors cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.pricing}
                </a>
                <Link
                  href="/login"
                  className="block py-2 text-[#1E1B4B]/70 hover:text-[#6366F1] transition-colors cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.signIn}
                </Link>
                <Link
                  href="/register"
                  className="block w-full text-center px-5 py-2.5 bg-[#6366F1] text-white rounded-xl font-semibold cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.tryFree}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative z-10 pt-32 pb-20 md:pt-40 md:pb-32 px-4 sm:px-6 lg:px-8"
      >
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="max-w-7xl mx-auto"
        >
          <div
            className={`flex flex-col ${isRtl ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`}
          >
            {/* Text Side */}
            <div
              className={`flex-1 text-center ${isRtl ? "lg:text-right" : "lg:text-left"}`}
            >
              <motion.div
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-[#6366F1]/15 text-[#6366F1] text-sm font-semibold mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
                {t.hero.badge}
              </motion.div>

              <motion.h1
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${isRtl ? "leading-[1.2]" : "leading-[1.08]"} mb-6 ${isRtl ? "font-[family-name:var(--font-cairo)]" : "font-[family-name:var(--font-serif)]"} text-[#1E1B4B]`}
              >
                {t.hero.titlePre}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#06B6D4]">
                  {t.hero.titleHighlight}
                </span>
              </motion.h1>

              <motion.p
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-[#1E1B4B]/60 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light"
              >
                {t.hero.desc}
              </motion.p>

              <motion.div
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`flex flex-col sm:flex-row items-center justify-center ${isRtl ? "lg:justify-start" : "lg:justify-start"} gap-4`}
              >
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#4F46E5] text-white rounded-xl font-semibold hover:bg-[#4338CA] transition-all duration-200 shadow-xl shadow-[#6366F1]/30 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  {t.hero.ctaPrimary}
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${isRtl ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}
                  />
                </Link>
                <a
                  href="#demo"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white/60 backdrop-blur-sm border border-[#6366F1]/10 text-[#1E1B4B] rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t.hero.ctaSecondary}
                </a>
              </motion.div>

              <motion.div
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.6, delay: 0.4 }}
                className={`mt-8 flex items-center justify-center ${isRtl ? "lg:justify-start" : "lg:justify-start"} gap-6 text-sm text-[#1E1B4B]/50`}
              >
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#06B6D4]" />
                  {t.hero.trust1}
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#06B6D4] fill-[#06B6D4]" />
                  {t.hero.trust2}
                </div>
              </motion.div>
            </div>

            {/* Image Side */}
            <div className="flex-1 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg aspect-[4/5]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366F1]/20 to-[#06B6D4]/10 blur-[60px] scale-90" />
                <div className="relative z-10 w-full h-full">
                  <img
                    src="/glad-mixed-race-woman-with-healthy-dark-skin-pleasant-smile-holds-cell-phone-takeaway-coffee-wears-pink-hijab-headscarf-denim-jacket-happy-receive-message-isolated-blue-wall.jpg"
                    alt="Customer using Nadil AI"
                    className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl"
                  />

                  {/* Floating Bubbles */}
                  {floatingMessages[lang].map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.5, 1, 1, 0.5],
                        y: [20, 0, -10, -30],
                      }}
                      transition={{
                        duration: 6,
                        delay: msg.delay,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeInOut",
                      }}
                      className={`absolute ${
                        msg.side === "right"
                          ? "-right-6 md:-right-12 top-[40%]"
                          : msg.side === "left"
                            ? "-left-6 md:-left-12 top-[35%]"
                            : msg.side === "top-right"
                              ? "right-2 md:right-8 top-[12%]"
                              : msg.side === "bottom-right"
                                ? "-right-4 md:-right-8 top-[65%]"
                                : msg.side === "bottom-left"
                                  ? "-left-4 md:-left-8 top-[60%]"
                                  : ""
                      } z-20 max-w-[180px] sm:max-w-[220px]`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs sm:text-sm shadow-lg backdrop-blur-sm ${
                          msg.type === "customer"
                            ? "bg-[#25D366] text-white rounded-br-sm"
                            : "bg-white/90 text-[#1E1B4B] rounded-bl-sm border border-[#6366F1]/10"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}

                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/50 z-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="relative z-10 py-24 md:py-32 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.featuresSection.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">
              {t.featuresSection.subtitle}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features[lang].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-[#6366F1]/8 hover:bg-white hover:border-[#6366F1]/20 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mb-4 group-hover:bg-[#6366F1] group-hover:text-white transition-colors`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-[#1E1B4B] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#1E1B4B]/55 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section
        id="demo"
        className="relative z-10 py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-white/40"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.demoSection.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">
              {t.demoSection.subtitle}
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {demoConversations[lang].map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveTab(conv.id)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  activeTab === conv.id
                    ? "bg-[#6366F1] text-white shadow-lg"
                    : "bg-white/60 text-[#1E1B4B]/60 hover:bg-white"
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-[#FAF5FF] rounded-3xl border border-[#6366F1]/10 shadow-xl overflow-hidden">
              <div
                className={`px-6 py-4 bg-white/80 border-b border-[#6366F1]/10 flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <h4 className="font-bold text-[#1E1B4B] text-sm">Nadil AI</h4>
                  <div
                    className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                    <span className="text-xs text-[#1E1B4B]/50">
                      {t.demoSection.online}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4 min-h-[320px]">
                <AnimatePresence mode="popLayout">
                  {currentConv?.messages
                    .slice(0, visibleMessages)
                    .map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.role === "customer" ? (isRtl ? "justify-start" : "justify-end") : msg.role === "system" ? "justify-center" : isRtl ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "system" ? (
                          <span className="text-xs text-[#1E1B4B]/40 italic py-2">
                            {msg.text}
                          </span>
                        ) : (
                          <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                              msg.role === "customer"
                                ? `bg-[#25D366] text-white ${isRtl ? "rounded-bl-sm" : "rounded-br-sm"}`
                                : `bg-white border border-[#6366F1]/10 text-[#1E1B4B] ${isRtl ? "rounded-br-sm" : "rounded-bl-sm"}`
                            }`}
                          >
                            {msg.text}
                          </div>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
                {visibleMessages > 0 &&
                  visibleMessages < (currentConv?.messages.length || 0) && (
                    <div
                      className={`flex ${isRtl ? "justify-end" : "justify-start"}`}
                    >
                      <div className="bg-white border border-[#6366F1]/10 rounded-2xl px-4 py-3 flex gap-1">
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-[#6366F1]"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                          className="w-2 h-2 rounded-full bg-[#6366F1]"
                        />
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                          className="w-2 h-2 rounded-full bg-[#6366F1]"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.howItWorks.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">{t.howItWorks.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps[lang].map((step, i) => (
              <motion.div
                key={i}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center relative group p-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center mx-auto mb-6 group-hover:bg-[#6366F1] group-hover:text-white transition-all">
                  {step.icon}
                </div>
                <span
                  className={`text-[8rem] font-bold text-[#6366F1]/[0.03] absolute top-0 ${isRtl ? "right-1/2 translate-x-1/2" : "left-1/2 -translate-x-1/2"} -translate-y-8 leading-none pointer-events-none`}
                >
                  {step.number}
                </span>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-[#1E1B4B]/55">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-white/40">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.faq.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">{t.faq.subtitle}</p>
          </motion.div>

          <div className="space-y-3">
            {[
              { q: t.faq.q1, a: t.faq.a1 },
              { q: t.faq.q2, a: t.faq.a2 },
              { q: t.faq.q3, a: t.faq.a3 },
              { q: t.faq.q4, a: t.faq.a4 },
              { q: t.faq.q5, a: t.faq.a5 },
            ].map((item, i) => (
              <motion.details
                key={i}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white/60 rounded-2xl p-5 cursor-pointer hover:bg-white border border-[#6366F1]/5 transition-colors duration-200"
              >
                <summary
                  className={`flex items-center justify-between gap-4 font-semibold text-[#1E1B4B] list-none ${isRtl ? "flex-row-reverse" : ""}`}
                >
                  <span className="text-sm md:text-base">{item.q}</span>
                  <svg
                    className="w-5 h-5 shrink-0 text-[#1E1B4B]/40 group-open:rotate-180 transition-transform duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-[#1E1B4B]/55 leading-relaxed">
                  {item.a}
                </p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative z-10 py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.testimonials.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">
              {t.testimonials.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                text: t.testimonials.t1,
                role: t.testimonials.t1role,
                initials: t.testimonials.t1initials,
              },
              {
                text: t.testimonials.t2,
                role: t.testimonials.t2role,
                initials: t.testimonials.t2initials,
              },
              {
                text: t.testimonials.t3,
                role: t.testimonials.t3role,
                initials: t.testimonials.t3initials,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/60 backdrop-blur-sm border border-[#6366F1]/8 rounded-2xl p-6 hover:bg-white hover:shadow-md transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="w-4 h-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-[#1E1B4B]/55 leading-relaxed mb-5">
                  &ldquo;{item.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#6366F1]/15 flex items-center justify-center font-bold text-xs text-[#6366F1]">
                    {item.initials}
                  </div>
                  <p className="text-xs text-[#1E1B4B]/45">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-[#1E1B4B]">
              {t.pricing.title}
            </h2>
            <p className="text-lg text-[#1E1B4B]/60">{t.pricing.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans[lang].map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 ${plan.highlighted ? "bg-[#6366F1] text-white shadow-xl scale-[1.02]" : "bg-white/60 border border-[#6366F1]/10"}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#06B6D4] text-white text-xs font-bold rounded-full">
                    {t.pricing.popular}
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p
                  className={`text-sm mb-6 ${plan.highlighted ? "text-white/70" : "text-[#1E1B4B]/50"}`}
                >
                  {plan.desc}
                </p>
                <div className="mb-8">
                  <span className="text-4xl font-bold">
                    {plan.price === "Custom" ||
                    plan.price === "مخصص" ||
                    plan.price === "Free"
                      ? plan.price
                      : `SAR ${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-sm opacity-60">
                      {t.pricing.month}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 ${plan.highlighted ? "text-[#06B6D4]" : "text-[#6366F1]"}`}
                      />
                      <span className="opacity-90">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full text-center py-3 rounded-xl font-bold ${plan.highlighted ? "bg-white text-[#6366F1]" : "bg-[#6366F1] text-white shadow-md hover:bg-[#4F46E5]"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-40 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2
            className={`text-4xl md:text-6xl font-bold mb-8 ${isRtl ? "leading-[1.3]" : "leading-tight"}`}
          >
            {t.ctaSection.titlePre}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#06B6D4]">
              {t.ctaSection.titleHighlight}
            </span>
          </h2>
          <p className="text-xl text-[#1E1B4B]/60 mb-10 max-w-2xl mx-auto">
            {t.ctaSection.desc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-10 py-4 bg-[#6366F1] text-white rounded-xl font-bold text-lg shadow-xl shadow-[#6366F1]/30 hover:bg-[#4F46E5]"
            >
              {t.ctaSection.primary}
            </Link>
            <a
              href="mailto:hello@nadil.ai"
              className="px-10 py-4 bg-white/60 border border-[#6366F1]/10 rounded-xl font-bold text-lg hover:bg-white"
            >
              {t.ctaSection.secondary}
            </a>
          </div>
          <p className="mt-6 text-sm text-[#1E1B4B]/40">
            {t.ctaSection.footerNote}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#6366F1]/10 bg-white/40 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <Link
                href="/v4"
                className="flex items-center gap-2 font-bold text-xl mb-4"
              >
                <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                Nadil<span className="text-[#6366F1]">AI</span>
              </Link>
              <p className="text-sm text-[#1E1B4B]/50 max-w-xs">
                {t.footer.desc}
              </p>
            </div>
            {/* Simple static links for brevity */}
            <div>
              <h4 className="text-sm font-bold mb-4">{t.footer.product}</h4>
              <div className="space-y-2.5 text-sm text-[#1E1B4B]/50">
                <a href="#features" className="block hover:text-[#6366F1]">
                  {t.footer.features}
                </a>
                <a href="#pricing" className="block hover:text-[#6366F1]">
                  {t.footer.pricing}
                </a>
                <a href="#demo" className="block hover:text-[#6366F1]">
                  {t.footer.demo}
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-4">{t.footer.company}</h4>
              <div className="space-y-2.5 text-sm text-[#1E1B4B]/50">
                <a href="#" className="block hover:text-[#6366F1]">
                  {t.footer.about}
                </a>
                <a href="#" className="block hover:text-[#6366F1]">
                  {t.footer.contact}
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-4">{t.footer.resources}</h4>
              <div className="space-y-2.5 text-sm text-[#1E1B4B]/50">
                <a href="#" className="block hover:text-[#6366F1]">
                  {t.footer.privacy}
                </a>
                <a href="#" className="block hover:text-[#6366F1]">
                  {t.footer.terms}
                </a>
              </div>
            </div>
          </div>
          <div
            className={`pt-8 border-t border-[#6366F1]/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#1E1B4B]/40 ${isRtl ? "sm:flex-row-reverse" : ""}`}
          >
            <p>
              © {new Date().getFullYear()} Nadil AI.{" "}
              {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
              {t.footer.systems}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
