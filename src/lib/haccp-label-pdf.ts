import type { jsPDF } from "jspdf";

const MODERN_CSS_COLOR = /lab\(|oklch\(|color-mix\(/i;

function fixModernColors(doc: Document) {
  const root = doc.querySelector(".haccp-label-pdf-root") as HTMLElement | null;
  if (!root) return;
  root.style.backgroundColor = "#ffffff";
  root.style.color = "#1e2530";

  root.querySelectorAll<HTMLElement>("*").forEach((node) => {
    const tag = node.tagName.toLowerCase();
    if (tag === "svg" || tag === "path") return;
    const computed = doc.defaultView?.getComputedStyle(node);
    if (!computed) return;
    if (MODERN_CSS_COLOR.test(computed.color)) {
      node.style.color = "#1e2530";
    }
    if (MODERN_CSS_COLOR.test(computed.backgroundColor)) {
      node.style.backgroundColor =
        computed.backgroundColor === "rgba(0, 0, 0, 0)" ? "transparent" : "#ffffff";
    }
    if (MODERN_CSS_COLOR.test(computed.borderColor)) {
      node.style.borderColor = "#e2e8f0";
    }
  });
}

/** html2canvas non gestisce bene oklch/lab e taglia spesso il contenuto sotto la piega. */
export async function captureElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<jsPDF> {
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const savedCaptureStyle = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    opacity: element.style.opacity,
    zIndex: element.style.zIndex,
    visibility: element.style.visibility,
    pointerEvents: element.style.pointerEvents,
  };
  element.style.position = "fixed";
  element.style.left = "0";
  element.style.top = "0";
  element.style.opacity = "1";
  element.style.visibility = "visible";
  element.style.zIndex = "0";
  element.style.pointerEvents = "none";
  void element.offsetHeight;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const width = Math.max(element.scrollWidth, element.clientWidth);
  const height = Math.max(element.scrollHeight, element.clientHeight);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width,
      height,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: Math.max(document.documentElement.clientHeight, height),
      onclone: (doc) => {
        const captureHost = doc.querySelector("[data-haccp-pdf-capture]") as HTMLElement | null;
        if (captureHost) {
          captureHost.style.position = "fixed";
          captureHost.style.left = "0";
          captureHost.style.top = "0";
          captureHost.style.opacity = "1";
          captureHost.style.visibility = "visible";
          captureHost.style.zIndex = "1";
        }
        fixModernColors(doc);
      },
    });
  } finally {
    element.style.position = savedCaptureStyle.position;
    element.style.left = savedCaptureStyle.left;
    element.style.top = savedCaptureStyle.top;
    element.style.opacity = savedCaptureStyle.opacity;
    element.style.zIndex = savedCaptureStyle.zIndex;
    element.style.visibility = savedCaptureStyle.visibility;
    element.style.pointerEvents = savedCaptureStyle.pointerEvents;
    window.scrollTo(0, prevScrollY);
  }

  if (canvas.width < 2 || canvas.height < 2) {
    throw new Error("Cattura PDF vuota");
  }

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const imgH = (canvas.height * usableW) / canvas.width;
  const pageBodyH = pageH - margin * 2;

  let heightLeft = imgH;
  let offsetY = margin;

  pdf.addImage(imgData, "JPEG", margin, offsetY, usableW, imgH);
  heightLeft -= pageBodyH;

  while (heightLeft > 0) {
    offsetY = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, offsetY, usableW, imgH);
    heightLeft -= pageBodyH;
  }

  pdf.setProperties({ title: filename.replace(/\.pdf$/i, "") });
  return pdf;
}
