import Link from "next/link";
import { UtensilsCrossed, CalendarClock, MessageCircle, BarChart3, ChevronRight, CheckCircle2 } from "lucide-react";

export default function LandingPageV2() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E40AF] font-sans selection:bg-[#CA8A04] selection:text-white relative overflow-hidden">
      
      {/* Dynamic Background Elements for Glassmorphism Context */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#3B82F6] opacity-10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[#1E3A8A] opacity-[0.07] blur-[150px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#CA8A04] opacity-[0.05] blur-[100px]"></div>
      </div>

      {/* Floating Navbar */}
      <nav className="fixed top-4 left-4 right-4 md:left-8 md:right-8 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-6xl z-50">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl px-6 py-4 flex justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-[#1E3A8A]">
            <UtensilsCrossed className="w-6 h-6 text-[#CA8A04]" />
            <span>Nadil</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/platform-login" className="hidden md:block text-[#1E40AF]/70 hover:text-[#CA8A04] transition-colors duration-200 cursor-pointer">Platform</Link>
            <Link href="/login" className="text-[#1E40AF]/70 hover:text-[#CA8A04] transition-colors duration-200 cursor-pointer">Sign In</Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 bg-[#1E3A8A] text-white rounded-xl hover:bg-[#172554] transition-colors duration-200 shadow-lg shadow-[#1E3A8A]/20 cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/40 shadow-sm text-[#1E3A8A] text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] animate-pulse"></span>
          Elevating Hospitality with AI
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-8 font-serif text-[#1E3A8A] max-w-4xl mx-auto">
          The fine dining <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E3A8A] to-[#CA8A04]">digital experience.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-[#1E40AF]/70 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Nadil is your intelligent AI waiter, seamlessly managing reservations and orders via WhatsApp with zero friction and pure elegance.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link 
            href="/register" 
            className="w-full sm:w-auto px-8 py-4 bg-[#CA8A04] text-white rounded-xl font-semibold hover:bg-[#A16207] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-[#CA8A04]/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            Start Free Trial <ChevronRight className="w-5 h-5" />
          </Link>
          <Link 
            href="#demo" 
            className="w-full sm:w-auto px-8 py-4 bg-white/50 backdrop-blur-sm border border-[#1E3A8A]/10 text-[#1E3A8A] rounded-xl font-semibold hover:bg-white/80 transition-all duration-300 flex items-center justify-center cursor-pointer"
          >
            Watch Demo
          </Link>
        </div>

        {/* Glass Mockup Graphic */}
        <div className="mt-20 w-full max-w-5xl mx-auto relative perspective-[1000px]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] to-transparent z-20 h-full w-full bottom-0 top-auto"></div>
          <div className="relative w-full aspect-video bg-white/40 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl overflow-hidden flex flex-col transform rotate-x-[5deg] hover:rotate-x-0 transition-transform duration-700 ease-out p-6">
            
            {/* Mockup Header */}
            <div className="flex items-center justify-between border-b border-[#1E3A8A]/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1E3A8A] flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-[#1E3A8A] text-lg leading-tight">Live Orders</h3>
                  <p className="text-sm text-[#1E3A8A]/60 font-medium">Nadil Kitchen Sync</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
              </div>
            </div>

            {/* Mockup Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {[
                { table: "Table 4", items: "2x Truffle Pasta", status: "Preparing" },
                { table: "Delivery", items: "1x Wagyu Burger", status: "New" },
                { table: "Table 12", items: "Wine Pairing Set", status: "Ready" }
              ].map((order, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold bg-[#F8FAFC] text-[#1E3A8A] px-2 py-1 rounded-md border border-[#1E3A8A]/5">{order.table}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      order.status === 'New' ? 'bg-[#CA8A04]/10 text-[#CA8A04]' : 
                      order.status === 'Preparing' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <h4 className="font-semibold text-[#1E3A8A] mb-1">{order.items}</h4>
                  <p className="text-xs text-[#1E40AF]/50 font-medium mb-4">Just now via WhatsApp</p>
                  
                  <div className="w-full h-1 bg-[#F8FAFC] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      order.status === 'New' ? 'bg-[#CA8A04] w-1/4' : 
                      order.status === 'Preparing' ? 'bg-[#3B82F6] w-2/3' : 
                      'bg-green-500 w-full'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-24 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6 text-[#1E3A8A]">Elegance meets efficiency.</h2>
          <p className="text-lg text-[#1E40AF]/70 font-light">
            Providing your guests with a white-glove digital experience while keeping your kitchen perfectly synchronized.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <MessageCircle className="w-6 h-6" />,
              title: "Conversational Luxury",
              desc: "A WhatsApp agent that speaks the language of fine dining, guiding guests through menus and reservations."
            },
            {
              icon: <CalendarClock className="w-6 h-6" />,
              title: "Automated Bookings",
              desc: "Real-time table availability synced directly with your floor plan. Zero double bookings."
            },
            {
              icon: <BarChart3 className="w-6 h-6" />,
              title: "Executive Insights",
              desc: "Actionable analytics on popular dishes, peak hours, and customer retention in a beautiful dashboard."
            }
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-white/40 backdrop-blur-sm border border-white/60 shadow-sm hover:bg-white/70 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center mb-6 group-hover:bg-[#CA8A04] transition-colors duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-[#1E3A8A] mb-3">{feature.title}</h3>
              <p className="text-[#1E40AF]/70 leading-relaxed font-light">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof / Checkmarks */}
      <section className="relative z-10 py-24 bg-white/60 border-y border-white/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1E3A8A] mb-6">Built for the modern restaurateur.</h2>
            <p className="text-lg text-[#1E40AF]/70 font-light mb-8">
              Focus on the culinary art and guest experience. Let Nadil handle the logistics of ordering and reservations.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "No app downloads needed",
                "Instant kitchen sync",
                "24/7 customer support",
                "Multi-language capabilities",
                "Seamless POS integration",
                "Real-time analytics"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#CA8A04]" />
                  <span className="text-[#1E3A8A] font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full flex justify-center">
             <div className="relative w-full max-w-sm aspect-[9/16] bg-[#1E3A8A] rounded-[3rem] border-8 border-white shadow-2xl overflow-hidden flex flex-col">
               {/* Mobile phone mock */}
               <div className="absolute top-0 inset-x-0 h-6 bg-white/10 z-10"></div>
               <div className="flex-1 p-6 flex flex-col justify-end bg-gradient-to-b from-[#1E3A8A] to-[#0F172A]">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-lg mb-4 transform translate-y-4 animate-slide-in-right opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
                    <p className="text-sm font-light">&quot;I would like to reserve a table for 4 at 8:00 PM tonight.&quot;</p>
                  </div>
                  <div className="bg-[#CA8A04] p-4 rounded-2xl rounded-tl-sm text-white shadow-lg transform translate-y-4 animate-slide-in-right opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '1s' }}>
                    <p className="text-sm font-medium">Perfect. Your table for 4 is confirmed for 8:00 PM. We look forward to serving you.</p>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-4 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-serif font-bold text-[#1E3A8A] mb-8">Ready to elevate your service?</h2>
        <p className="text-xl text-[#1E40AF]/70 mb-10 font-light">Join exclusive restaurants using Nadil AI to streamline operations and delight guests.</p>
        <Link 
          href="/register" 
          className="inline-flex px-12 py-5 bg-[#1E3A8A] text-white rounded-2xl font-bold text-lg hover:bg-[#CA8A04] hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-[#1E3A8A]/20 cursor-pointer"
        >
          Begin Your Journey
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/50 backdrop-blur-md border-t border-[#1E3A8A]/10 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-serif text-xl font-bold text-[#1E3A8A]">
            <UtensilsCrossed className="w-5 h-5 text-[#CA8A04]" />
            <span>Nadil</span>
          </div>
          <div className="text-sm font-medium text-[#1E40AF]/50">
            &copy; {new Date().getFullYear()} Nadil AI. Elegance in Automation.
          </div>
        </div>
      </footer>
    </div>
  );
}
