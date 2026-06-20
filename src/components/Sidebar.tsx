
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Settings2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SidebarProps {
  userName: string;
  onLogout: () => void;
  isReadOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ userName, onLogout, isReadOnly = false }) => {
  const pathname = usePathname();
  
  const navItems = [
    { id: 'dashboard', label: 'Bord', href: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'treasury', label: 'Trésor', href: '/treasury', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'inventory', label: 'Stock', href: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'spare-parts', label: 'Pièces Rechange', href: '/spare-parts', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'contacts', label: 'Partenaires', href: '/contacts', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
    { id: 'stock-entries', label: 'Entrées', href: '/stock-entries', icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
    { id: 'deliveries', label: 'Ventes', href: '/deliveries', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'payments', label: 'Finance', href: '/payments', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 v14a2 2 0 002 2z' },
    { id: 'accounting', label: 'Compta', href: '/accounting', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'recouvrement', label: 'Recouvr.', href: '/recouvrement', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'sav', label: 'SAV', href: '/sav', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'help', label: 'Aide', href: '/help', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const isCurrentView = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  const SidebarContentComponent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <div className="p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight leading-tight">
              TP<span className="text-blue-500">MASTER</span>
            </h1>
            {isReadOnly && (
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Lecture Seule</span>
            )}
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
           <Link href={item.href} key={item.id} passHref>
            <div
              className={`w-full text-left px-5 py-3 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden cursor-pointer ${
                isCurrentView(item.href)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${isCurrentView(item.href) ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="font-bold text-xs tracking-wide">{item.label}</span>
              {isCurrentView(item.href) && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-6 m-4 bg-white/5 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-black text-white text-sm">
            {userName.charAt(0)}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-black text-white truncate uppercase tracking-wider">{userName}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Online</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 h-[96vh] m-[2vh] rounded-[2.5rem] flex-col fixed left-0 top-0 z-50 border border-white/5 shadow-2xl overflow-hidden glass-dark">
        <SidebarContentComponent />
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 text-white z-50 flex items-center justify-between px-6 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-sm font-black tracking-tight">
            TP<span className="text-blue-500">MASTER</span>
          </h1>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 bg-white/5 rounded-xl text-slate-300 active:scale-95 transition-all">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-none w-72 bg-slate-950">
            <SheetHeader className="hidden">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContentComponent />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
};

export default Sidebar;
