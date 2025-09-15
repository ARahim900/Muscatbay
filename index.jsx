import Layout from "./Layout.jsx";

import Water from "./Water";

import Electricity from "./Electricity";

import HVAC from "./HVAC";

import Firefighting from "./Firefighting";

import Contractors from "./Contractors";

import STP from "./STP";

import WaterDaily from "./WaterDaily";

import Assistant from "./Assistant";

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