(function () {
  if (typeof window === "undefined") return;

  var script = document.currentScript as HTMLScriptElement | null;
  var rawSlug =
    script?.getAttribute("data-project") ||
    (window as unknown as { __PHOLIO_SLUG__?: string }).__PHOLIO_SLUG__;

  if (!rawSlug || !/^[a-z0-9-]{3,64}$/.test(rawSlug)) return;
  var telemetrySlug = rawSlug;

  var scriptSrc = script?.src || "";
  var baseUrl = "";
  try {
    if (scriptSrc) baseUrl = new URL(scriptSrc).origin;
  } catch {
    baseUrl = "";
  }

  var ingestUrl = baseUrl ? baseUrl + "/api/ingest" : "/api/ingest";

  var SESSION_KEY = "_pholio_sid";
  var sessionId: string | null = null;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId || !/^[A-Za-z0-9_-]{3,128}$/.test(sessionId)) {
      sessionId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = Math.random().toString(36).substring(2, 15);
  }

  function ping() {
    var path = window.location.pathname || "/";
    if (path.length > 500) path = path.slice(0, 500);
    var payload = JSON.stringify({
      telemetry_slug: telemetrySlug,
      path: path,
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

  ping();
  setInterval(ping, 60000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") ping();
  });
})();
