import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} />
      <main className="lg:ml-60 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}