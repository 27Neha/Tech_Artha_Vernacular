import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useKyc() {
  const [isCheckingKyc, setIsCheckingKyc] = useState(false);
  const router = useRouter();

  const requireKyc = useCallback(async (destinationPath: string) => {
    setIsCheckingKyc(true);
    let verified = false;
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return false;
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/v1/kyc/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'VERIFIED') {
          verified = true;
        }
      }
      
      if (verified) {
        // Already verified, proceed to destination
        if (destinationPath !== window.location.pathname + window.location.search) {
          router.push(destinationPath);
        }
      } else {
        // Not verified, or no record. Go to KYC with returnUrl
        router.push(`/kyc?next=${encodeURIComponent(destinationPath)}`);
      }
    } catch (e) {
      console.error('Failed to check KYC status', e);
      router.push(`/kyc?next=${encodeURIComponent(destinationPath)}`);
    } finally {
      setIsCheckingKyc(false);
    }
    return verified;
  }, [router]);

  return { requireKyc, isCheckingKyc };
}
