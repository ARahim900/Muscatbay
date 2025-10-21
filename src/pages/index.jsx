import Layout from "@/pages/Layout.jsx";

import Water from "@/pages/Water";

import Electricity from "@/pages/Electricity";

import HVAC from "@/pages/HVAC";

import Firefighting from "@/pages/Firefighting";

import Contractors from "@/pages/Contractors";

import STP from "@/pages/STP";

import WaterDaily from "@/pages/WaterDaily";

import Assistant from "@/pages/Assistant";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Water: Water,
    
    Electricity: Electricity,
    
    HVAC: HVAC,
    
    Firefighting: Firefighting,
    
    Contractors: Contractors,
    
    STP: STP,
    
    WaterDaily: WaterDaily,
    
    Assistant: Assistant,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Water />} />
                
                
                <Route path="/Water" element={<Water />} />
                
                <Route path="/Electricity" element={<Electricity />} />
                
                <Route path="/HVAC" element={<HVAC />} />
                
                <Route path="/Firefighting" element={<Firefighting />} />
                
                <Route path="/Contractors" element={<Contractors />} />
                
                <Route path="/STP" element={<STP />} />
                
                <Route path="/WaterDaily" element={<WaterDaily />} />
                
                <Route path="/Assistant" element={<Assistant />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}