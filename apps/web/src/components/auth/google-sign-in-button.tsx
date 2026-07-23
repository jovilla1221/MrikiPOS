'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: 'standard';
      theme: 'outline';
      size: 'large';
      text: 'signin_with' | 'signup_with';
      shape: 'rectangular';
      logo_alignment: 'left';
      width: number;
      locale: string;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void | Promise<void>;
  mode?: 'signin' | 'signup';
}

export const GOOGLE_SIGN_IN_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export function GoogleSignInButton({ onCredential, mode = 'signin' }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const renderButton = useCallback(() => {
    if (!clientId || !buttonRef.current || !window.google?.accounts.id) return;

    buttonRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: clientId,
      context: mode,
      callback: (response) => {
        if (response.credential) void onCredential(response.credential);
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(buttonRef.current.clientWidth || 360, 360),
      locale: 'id',
    });
  }, [clientId, mode, onCredential]);

  useEffect(() => {
    if (window.google?.accounts.id) {
      setScriptReady(true);
      renderButton();
    }
  }, [renderButton]);

  useEffect(() => {
    if (scriptReady) renderButton();
  }, [renderButton, scriptReady]);

  if (!clientId) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client?hl=id"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div
        ref={buttonRef}
        className="flex min-h-11 w-full items-center justify-center"
        aria-label={mode === 'signup' ? 'Daftar dengan Google' : 'Masuk dengan Google'}
      />
    </>
  );
}
