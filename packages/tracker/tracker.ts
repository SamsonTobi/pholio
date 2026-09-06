(function () {
  if (typeof window === "undefined") return;

  const script = document.currentScript as HTMLScriptElement | null;
  const telemetrySlug =
    script?.getAttribute("data-project") ||
    (window as unknown as { __PHOLIO_SLUG__?: string }).__PHOLIO_SLUG__;

  if (!telemetrySlug) return;

  const scriptSrc = script?.src || "";
  let baseUrl = "";
  try {
    if (scriptSrc) {
      const url = new URL(scriptSrc);
      baseUrl = url.origin;
    }
  } catch {
    baseUrl = "";
  }

  const ingestUrl = baseUrl ? `${baseUrl}/api/ingest` : "/api/ingest";

  // Session hash in memory & sessionStorage (no cookies)
  const SESSION_KEY = "_pholio_sid";
  let sessionId: string | null = null;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = Math.random().toString(36).substring(2, 15);
  }

  function ping() {
    const payload = JSON.stringify({
      telemetry_slug: telemetrySlug,
      path: window.location.pathname,
      session_hash: sessionId,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(ingestUrl, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  // Initial ping
  ping();

  // 30s heartbeat
  setInterval(ping, 30000);

  // Visibility change ping
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ping();
    }
  });
})();
