import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * "Continue with Google" button (Google Identity Services).
 * Renders nothing until VITE_GOOGLE_CLIENT_ID is set, so the page stays clean.
 */
export function GoogleButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (credential: string) => void;
  text?: "signup_with" | "signin_with" | "continue_with";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (r: { credential: string }) => cb.current(r.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        text,
        shape: "pill",
        width: 300,
      });
    };

    if (window.google?.accounts?.id) {
      init();
      return () => {
        cancelled = true;
      };
    }

    let s = document.getElementById("gsi-script") as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script");
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", init);
    return () => {
      cancelled = true;
      s?.removeEventListener("load", init);
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  return (
    <div className="flex justify-center">
      <div ref={ref} />
    </div>
  );
}
