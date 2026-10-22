import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { Home } from './pages/Home';
import { BrowseItems } from './pages/BrowseItems';
import { ReportItem } from './pages/ReportItem';
import { ItemDetails } from './pages/ItemDetails';
import { ManageReport } from './pages/ManageReport';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { About } from './pages/About';
import { NotFound } from './pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/items" element={<BrowseItems />} />
                <Route path="/report/lost" element={<ReportItem defaultType="lost" />} />
                <Route path="/report/found" element={<ReportItem defaultType="found" />} />
                <Route path="/items/:itemId" element={<ItemDetails />} />
                <Route path="/manage/:itemId" element={<ManageReport />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
