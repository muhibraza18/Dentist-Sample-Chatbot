(function () {
  const button = document.createElement("button");
  button.textContent = "Chat with our dental assistant";
  button.style.cssText = "position:fixed;right:24px;bottom:24px;padding:14px 18px;border-radius:999px;background:#06b6d4;color:white;border:none;box-shadow:0 10px 30px rgba(0,0,0,.3);z-index:9999;cursor:pointer;";

  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;right:24px;bottom:84px;width:360px;max-width:calc(100vw - 48px);height:520px;background:white;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:none;flex-direction:column;overflow:hidden;z-index:9999;";

  const header = document.createElement("div");
  header.textContent = "Dental Receptionist";
  header.style.cssText = "background:#0f172a;color:white;padding:16px;font-weight:600;";

  const body = document.createElement("iframe");
  const scriptUrl = document.currentScript && document.currentScript.src ? new URL(document.currentScript.src) : null;
  const widgetOrigin = scriptUrl ? scriptUrl.origin : window.location.origin;
  const clientSlug = document.currentScript && document.currentScript.dataset ? document.currentScript.dataset.clientSlug : "";
  body.src = `${widgetOrigin}/widget${clientSlug ? `?client_slug=${encodeURIComponent(clientSlug)}` : ""}`;
  body.style.cssText = "border:none;flex:1;width:100%;";

  panel.appendChild(header);
  panel.appendChild(body);
  button.onclick = () => (panel.style.display = panel.style.display === "none" ? "flex" : "none");
  document.body.appendChild(button);
  document.body.appendChild(panel);
})();
