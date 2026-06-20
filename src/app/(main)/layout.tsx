'use client';
import React, { useEffect } from 'react';
import { useUser, useFirestore, useAuth, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    
    // Si c'est l'admin qui se connecte, on enregistre son UID pour que le consultant puisse voir ses données
    if (user && user.email !== 'tarik@tpmaster.ma') {
      const configRef = doc(firestore, 'config', 'app');
      setDocumentNonBlocking(configRef, { adminUid: user.uid }, { merge: true });
    }
  }, [isUserLoading, user, router, firestore]);

  if (isUserLoading || !user) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-[#F0F2F5]">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">Chargement...</p>
        </div>
      );
  }

  const isReadOnly = user.email === 'tarik@tpmaster.ma';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F0F2F5] relative overflow-hidden">
      <Sidebar 
        userName={user.email || 'Utilisateur'} 
        onLogout={() => auth.signOut()} 
        isReadOnly={isReadOnly}
      />
      
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto w-full z-10">
        <div className="max-w-7xl mx-auto">
            <div className="animate-viewTransition">
              {children}
            </div>
        </div>
      </main>
    </div>
  );
}
