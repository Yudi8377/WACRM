"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    WACRMAndroid?: {
      showToast?: (message: string) => void;
      shareText?: (title: string, text: string) => void;
      hapticFeedback?: () => void;
      getAppVersion?: () => string;
      openSettings?: () => void;
    };
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is progressive; ignore if unsupported in sandboxed iframe.
    });
  }, []);

  return null;
}

export function notifyAndroid(message: string) {
  if (typeof window !== "undefined" && window.WACRMAndroid?.showToast) {
    window.WACRMAndroid.showToast(message);
  }
}
