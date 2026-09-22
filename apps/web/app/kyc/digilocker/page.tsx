'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DigilockerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Initializing DigiLocker connection...');
  const [error, setError] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    const callback = searchParams?.get('callback');
    const success = searchParams?.get('success');

    if (callback && success === 'true') {
      setStatus('Aadhaar fetched successfully. Processing KYC...');
      // In a real integration, the provider usually hits our webhook. 
      // But we can also poll status here to see if it moved to ESIGN_REQUIRED.
      const checkStatus = async () => {
        try {
          const res = await fetch(`\${API_URL}/api/v1/kyc/status`, {
            headers: { 'Authorization': `Bearer \${token}` }
          });
          const data = await res.json();
          
          if (data.status === 'ESIGN_REQUIRED') {
            router.push('/kyc/esign');
          } else if (data.status === 'VERIFIED') {
            router.push('/dashboard');
          } else {
            // Keep polling or show a button
            setTimeout(checkStatus, 3000);
          }
        } catch (e: any) {
          setError(e.message || 'Failed to verify KYC status');
        }
      };
      checkStatus();
      return;
    } else if (callback && success === 'false') {
      setError('DigiLocker authorization was denied or failed.');
      return;
    }

    // Start flow
    const startFlow = async () => {
      try {
        const redirectUrl = window.location.origin + '/kyc/digilocker?callback=true&success=true';
        const res = await fetch(`\${API_URL}/api/v1/kyc/digilocker/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer \${token}`
          },
          body: JSON.stringify({ redirectUrl })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Failed to get Digilocker URL');
        if (data.url || data.digilocker_url) {
          setStatus('Redirecting to DigiLocker...');
          window.location.href = data.url || data.digilocker_url;
        } else {
          // If no URL is returned, mock the redirect for testing purposes
          setStatus('Redirecting to DigiLocker (Mock)...');
          setTimeout(() => {
             window.location.href = redirectUrl;
          }, 1500);
        }
      } catch (e: any) {
        setError(e.message || 'Something went wrong');
      }
    };
    
    startFlow();
  }, [router, searchParams]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full text-center">
        {!error ? (
          <>
            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">DigiLocker Verification</h2>
            <p className="text-gray-500 text-sm">{status}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button onClick={() => router.push('/signup')} className="btn-primary w-full">
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
