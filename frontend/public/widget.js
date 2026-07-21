(function () {
  // Prevent duplicate execution
  if (window.__dentalChatbotInitialized) return;
  window.__dentalChatbotInitialized = true;

  // Find the current script tag
  const scripts = document.getElementsByTagName("script");
  let currentScript = null;
  let clientSlug = "default";
  let hostUrl = "http://localhost:3000";

  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes("widget.js")) {
      currentScript = scripts[i];
      clientSlug = currentScript.getAttribute("data-client-slug") || "default";
      const url = new URL(currentScript.src);
      hostUrl = url.origin;
      break;
    }
  }

  // Create container
  const container = document.createElement("div");
  container.id = "dental-chatbot-widget-container";
  container.style.position = "fixed";
  container.style.bottom = "24px";
  container.style.right = "24px";
  container.style.zIndex = "999999";
  container.style.fontFamily = "sans-serif";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "flex-end";
  document.body.appendChild(container);

  // Create iframe wrapper (hidden by default)
  const iframeWrapper = document.createElement("div");
  iframeWrapper.style.display = "none";
  iframeWrapper.style.marginBottom = "16px";
  iframeWrapper.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  iframeWrapper.style.borderRadius = "16px";
  iframeWrapper.style.overflow = "hidden";
  iframeWrapper.style.transition = "all 0.3s ease";
  iframeWrapper.style.opacity = "0";
  iframeWrapper.style.transform = "translateY(10px)";
  iframeWrapper.style.backgroundColor = "#020617"; // bg-slate-950

  // Responsive styling
  function updateIframeSize() {
    if (window.innerWidth <= 480) {
      iframeWrapper.style.width = "calc(100vw - 20px)";
      iframeWrapper.style.height = "calc(100vh - 100px)";
      iframeWrapper.style.position = "fixed";
      iframeWrapper.style.bottom = "80px";
      iframeWrapper.style.right = "10px";
      iframeWrapper.style.marginBottom = "0";
    } else {
      iframeWrapper.style.width = "380px";
      iframeWrapper.style.height = "650px";
      iframeWrapper.style.position = "relative";
      iframeWrapper.style.bottom = "auto";
      iframeWrapper.style.right = "auto";
      iframeWrapper.style.marginBottom = "16px";
    }
  }
  
  window.addEventListener("resize", updateIframeSize);
  updateIframeSize();

  const iframe = document.createElement("iframe");
  iframe.src = `${hostUrl}/widget?client_slug=${clientSlug}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframeWrapper.appendChild(iframe);
  container.appendChild(iframeWrapper);

  // Create launcher button
  const launcher = document.createElement("button");
  launcher.setAttribute("aria-label", "Open Chatbot");
  launcher.style.width = "60px";
  launcher.style.height = "60px";
  launcher.style.borderRadius = "30px";
  launcher.style.backgroundColor = "#06b6d4"; // cyan-500
  launcher.style.color = "white";
  launcher.style.border = "none";
  launcher.style.cursor = "pointer";
  launcher.style.boxShadow = "0 4px 12px rgba(6, 182, 212, 0.4)";
  launcher.style.display = "flex";
  launcher.style.alignItems = "center";
  launcher.style.justifyContent = "center";
  launcher.style.transition = "transform 0.2s ease, background-color 0.2s ease";
  launcher.style.padding = "0";

  // Chat icon SVG
  const chatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  // Close icon SVG
  const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  launcher.innerHTML = chatIcon;

  // Hover effects
  launcher.addEventListener("mouseenter", () => {
    launcher.style.transform = "scale(1.05)";
  });
  launcher.addEventListener("mouseleave", () => {
    launcher.style.transform = "scale(1)";
  });

  let isOpen = false;

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeWrapper.style.display = "block";
      setTimeout(() => {
        iframeWrapper.style.opacity = "1";
        iframeWrapper.style.transform = "translateY(0)";
      }, 10);
      launcher.innerHTML = closeIcon;
      launcher.setAttribute("aria-label", "Close Chatbot");
    } else {
      iframeWrapper.style.opacity = "0";
      iframeWrapper.style.transform = "translateY(10px)";
      setTimeout(() => {
        iframeWrapper.style.display = "none";
      }, 300);
      launcher.innerHTML = chatIcon;
      launcher.setAttribute("aria-label", "Open Chatbot");
    }
  }

  launcher.addEventListener("click", toggleWidget);
  container.appendChild(launcher);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleWidget();
    }
  });

  // Listen for message from iframe to close
  window.addEventListener("message", (event) => {
    if (event.data === "close-chat-widget" && isOpen) {
      toggleWidget();
    }
  });

})();
