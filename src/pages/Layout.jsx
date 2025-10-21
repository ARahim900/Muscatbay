

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";
import {
  Droplets,
  Zap,
  Wind,
  Shield,
  Users,
  Settings,
  Bell,
  Menu,
  X,
  Search,
  User as UserIcon,
  Sun,
  Moon,
  Bot,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Updated navigation without separate WaterDaily item
const navigationItems = [
{ title: "Water System", url: createPageUrl("Water"), icon: Droplets },
{ title: "Electricity System", url: createPageUrl("Electricity"), icon: Zap },
{ title: "HVAC System", url: createPageUrl("HVAC"), icon: Wind },
{ title: "Firefighting & Alarm", url: createPageUrl("Firefighting"), icon: Shield },
{ title: "Contractor Tracker", url: createPageUrl("Contractors"), icon: Users },
{ title: "STP Plant", url: createPageUrl("STP"), icon: Settings },
{ title: "AI Assistant", url: createPageUrl("Assistant"), icon: Bot }];

const bottomNavItems = [
{ title: "Water", icon: Droplets, url: createPageUrl("Water") },
{ title: "Power", icon: Zap, url: createPageUrl("Electricity") },
{ title: "HVAC", icon: Wind, url: createPageUrl("HVAC") },
{ title: "Fire", icon: Shield, url: createPageUrl("Firefighting") },
{ title: "Work", icon: Users, url: createPageUrl("Contractors") },
{ title: "STP", icon: Settings, url: createPageUrl("STP") }];

const ThemeToggle = ({ className }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setIsTransitioning(true);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Add smooth transition
    document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    setTimeout(() => {
      setTheme(newTheme);
      setIsTransitioning(false);
      document.documentElement.style.transition = '';
    }, 150);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={isTransitioning}
      className="text-zinc-100 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-10 w-10 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Hide-on-scroll header state
  const [hideHeader, setHideHeader] = React.useState(false);
  const lastScrollYRef = React.useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY || 0;
      const isScrollingDown = currentY > lastScrollYRef.current;
      const threshold = 48;
      setHideHeader(isScrollingDown && currentY > threshold);
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getPageTitle = (name) => {
    const item = navigationItems.find((nav) => {
      const pageNameForUrl = nav.url.split('/').pop().split('?')[0];
      return pageNameForUrl === name;
    });
    // Handle Water System with sub-views
    if (name === "Water") return "Water System";
    return item ? item.title : name;
  };

  const CollapsibleMenuItem = ({ item, isActive, isMobile = false, onItemClick = () => {} }) => {
    const pageNameForUrl = item.url.split('/').pop().split('?')[0];
    const isItemActive = pageNameForUrl === currentPageName || (currentPageName === 'Dashboard' && pageNameForUrl === 'Water');

    return (
      <Link
        to={item.url}
        onClick={onItemClick}
        className={`text-zinc-200 px-4 py-2.5 flex items-center gap-3 rounded-lg transition-all duration-300 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white ${isItemActive ? 'bg-white/10' : ''}`}
      >
        <item.icon className="w-5 h-5" />
        {(!sidebarCollapsed || isMobile) && (
          <span className="text-justify text-sm font-semibold">{item.title}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-all duration-300">
      <style>{`
        :root {
          --primary: #4e4456;
          --accent: #00D2B3;
          --color-success: #10b981;
          --color-warning: #f59e0b;
          --color-alert: #ef4444;
          --bg: #ffffff;
          --fg: #000000;
          --surface: #f8fafc;
          --surface-hover: #f1f5f9;
        }
        .dark {
          --primary: #4e4456;
          --accent: #00D2B3;
          --color-success: #34d399;
          --color-warning: #fbbf24;
          --color-alert: #f87171;
          --bg: #0f172a;
          --fg: #f8fafc;
          --surface: #1e293b;
          --surface-hover: #334155;
        }
        
        /* Enhanced dark mode transitions and gradients */
        * {
          transition-property: background-color, border-color, color, fill, stroke, box-shadow, transform;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }
        
        /* Smooth theme transitions with enhanced effects */
        .theme-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Enhanced dark mode background gradients */
        .dark {
          background-image: 
            radial-gradient(at 40% 20%, rgba(120, 119, 198, 0.05) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(120, 119, 198, 0.05) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(120, 119, 198, 0.05) 0px, transparent 50%);
        }
        
        /* Enhanced scrollbar for dark mode */
        .dark ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .dark ::-webkit-scrollbar-track {
          background: rgb(30, 41, 59);
          border-radius: 4px;
        }
        
        .dark ::-webkit-scrollbar-thumb {
          background: rgb(71, 85, 105);
          border-radius: 4px;
        }
        
        .dark ::-webkit-scrollbar-thumb:hover {
          background: rgb(100, 116, 139);
        }
        
        /* Enhanced card shadows for dark mode */
        .dark .shadow-lg {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
        }
        
        .dark .shadow-xl {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        }
        
        /* Enhanced border colors for dark mode */
        .dark .border-gray-200 {
          border-color: rgb(71, 85, 105);
        }
        
        .dark .border-gray-300 {
          border-color: rgb(100, 116, 139);
        }
        
        /* Enhanced text colors for better contrast */
        .dark .text-gray-600 {
          color: rgb(203, 213, 225);
        }
        
        .dark .text-gray-500 {
          color: rgb(148, 163, 184);
        }
        
        .dark .text-gray-400 {
          color: rgb(148, 163, 184);
        }
        
        /* Enhanced glass morphism effects */
        .dark .backdrop-blur-lg {
          backdrop-filter: blur(16px) saturate(180%);
          background-color: rgba(30, 41, 59, 0.8);
        }
        
        /* Enhanced hover effects for dark mode */
        .dark .hover\:bg-gray-50:hover {
          background-color: rgb(51, 65, 85);
        }
        
        .dark .hover\:bg-gray-100:hover {
          background-color: rgb(71, 85, 105);
        }
      `}</style>

      {/* Top Header */}
      <header className={`bg-gradient-to-r from-[#4E4456] to-[#5a4d5f] text-slate-50 px-4 py-3 dark:from-gray-900 dark:to-gray-800 dark:text-white flex items-center justify-between shadow-xl z-40 relative sticky top-0 transition-all duration-300 border-b border-white/10 dark:border-gray-700 ${hideHeader ? "-translate-y-full" : "translate-y-0"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 ring-2 ring-white/20">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ab9ed97412dcfe330813a6/22c0b05f3_IMG_3418.jpg"
              alt="App logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">{getPageTitle(currentPageName)}</h1>
            <p className="text-zinc-200 text-xs dark:text-white/80">Muscat Bay Resource Management</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="text-zinc-200 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-10 w-10 dark:text-white hover:bg-white/10 dark:hover:bg-white/20">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-100 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:text-accent-foreground h-10 w-10 dark:text-white hover:bg-white/10 dark:hover:bg-white/20 relative">
            <Bell className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full border-2 border-white dark:border-[var(--primary)] animate-pulse"></div>
          </Button>
          <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm flex items-center gap-2 dark:bg-white/10 rounded-lg transition-all duration-300 hover:bg-white/20">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent)] to-[var(--color-success)] rounded-full flex items-center justify-center ring-2 ring-white/30">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="font-medium">Admin</span>
          </div>
        </div>

        <div className="lg:hidden">
          <ThemeToggle />
        </div>
      </header>

      {/* Toolbar below Navbar (mobile): Hamburger relocated here */}
      <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 transition-colors duration-300">
        <div className="text-gray-900 dark:text-white px-3 py-2 shadow-md flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-[#4e4456] dark:text-white hover:bg-white/10 h-10 w-10"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center text-sm opacity-80">
            Quick Menu
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-68px)]">
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex lg:flex-col lg:bg-white dark:bg-gray-900 lg:text-gray-700 dark:text-white transition-all duration-300 border-r border-gray-200 dark:border-gray-800 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
          <div className="bg-gradient-to-r from-[#4E4456] to-[#5a4d5f] dark:from-gray-800 dark:to-gray-900 p-4 flex items-center justify-between border-b border-white/10 dark:border-gray-700">
            {!sidebarCollapsed && (
              <span className="text-zinc-200 text-sm font-medium dark:text-white">Navigation</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-zinc-200 hover:bg-white/10 dark:hover:bg-white/20 h-8 w-8 transition-colors"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
          </div>
          <nav className="bg-gradient-to-b from-[#4E4456] to-[#5a4d5f] dark:from-gray-800 dark:to-gray-900 p-4 flex-1 space-y-1">
            {navigationItems.map((item) => (
              <CollapsibleMenuItem
                key={item.title}
                item={item}
                isActive={false}
                isMobile={false}
              />
            ))}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 z-50 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative bg-white dark:bg-[var(--primary)] text-gray-700 dark:text-white w-72 h-full shadow-xl flex flex-col transition-colors duration-300">
            <div className="bg-[#4e4456] text-zinc-100 p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-1 flex-1">
              {navigationItems.map((item) => (
                <CollapsibleMenuItem
                  key={item.title}
                  item={item}
                  isActive={false}
                  isMobile={true}
                  onItemClick={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 bg-gray-50 dark:bg-gray-950 overflow-y-auto transition-colors duration-300">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <footer className="lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 fixed bottom-0 left-0 right-0 z-40 transition-colors duration-300">
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const pageNameForUrl = item.url.split('/').pop().split('?')[0];
            const isActive = pageNameForUrl === currentPageName || currentPageName === 'Dashboard' && pageNameForUrl === 'Water';
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center justify-center gap-1 p-1 w-16 h-14 rounded-md transition-all duration-300 ${
                isActive ? 'text-[var(--accent)] bg-green-50 dark:bg-green-500/10' : 'text-gray-500 dark:text-gray-400'}`
                }>
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.title}</span>
              </Link>);
          })}
        </div>
      </footer>
    </div>);
}

