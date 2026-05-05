export default function SocialProof() {
  return (
    <section className="py-12 border-b border-slate-100 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <p className="text-center text-sm font-bold text-slate-400 mb-8 tracking-wide">
          تثق بنا الشركات الرائدة للنمو وخدمة العملاء عبر واتساب
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {/* Company placeholder logos using text/icons */}
          <div className="text-2xl font-black text-slate-300 opacity-70">CompanyA</div>
          <div className="text-2xl font-black text-slate-300 opacity-70">BrandBox</div>
          <div className="text-2xl font-black text-slate-300 opacity-70">TechFlow</div>
          <div className="text-2xl font-black text-slate-300 opacity-70">GlobalNet</div>
          <div className="text-2xl font-black text-slate-300 opacity-70">StorePay</div>
        </div>
      </div>
    </section>
  );
}