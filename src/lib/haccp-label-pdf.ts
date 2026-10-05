import type { jsPDF } from "jspdf";

/** html2canvas non gestisce bene oklch/lab e taglia spesso il contenuto sotto la piega. */
export async function captureElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<jsPDF> {
  const prevScrollY = window.scrollY;
  window.scrollTo(0, 0);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const width = element.scrollWidth;
  const height = element.scrollHeight;

  const canvas = await html2canvas(element, {
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
      const root = doc.querySelector(".haccp-label-pdf-root") as HTMLElement | null;
      if (!root) return;
      root.querySelectorAll<HTMLElement>("*").forEach((node) => {
        const tag = node.tagName.toLowerCase();
        if (tag === "svg" || tag === "path") return;
        const computed = doc.defaultView?.getComputedStyle(node);
        if (!computed) return;
        if (computed.color.includes("lab(") || computed.color.includes("oklch(")) {
          node.style.color = "#1e2530";
        }
        if (
          computed.backgroundColor.includes("lab(") ||
          computed.backgroundColor.includes("oklch(")
        ) {
          node.style.backgroundColor = "#ffffff";
        }
        if (computed.borderColor.includes("lab(") || computed.borderColor.includes("oklch(")) {
          node.style.borderColor = "#e2e8f0";
        }
      });
    },
  });

  window.scrollTo(0, prevScrollY);

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
