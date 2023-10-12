/**
 * bdc service
 */

const fs = require("fs/promises");
const puppeteer = require("puppeteer");
import { factories } from "@strapi/strapi";
import { PageSizes, PDFDocument } from "pdf-lib";
import fetch from "node-fetch";

module.exports = factories.createCoreService("api::bdc.bdc", ({ strapi }) => ({
  async createDocument(attachments = [], id, token, requestOrigin) {
    const pdfDoc = await PDFDocument.create();

    // Create a new page with A4 dimensions (210 x 297 mm)
    const a4Page = pdfDoc.addPage(PageSizes.A4);
    // Fetch the cover page screenshot with print CSS query
    const screenshotUrl = `${requestOrigin}/generateCover/${id}`; // Replace with the URL you want to capture

    console.log(screenshotUrl);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 1123 });

    // Set viewport to emulate "print" media type
    await page.emulateMediaType("print");

    await page.setExtraHTTPHeaders({
      Authorization: `Bearer ${token}`,
    });

    await page.goto(screenshotUrl, {
      waitUntil: "networkidle0",
    });

    await page.reload({
      waitUntil: "networkidle0",
    });

    // Capture the screenshot of the entire page
    const screenshot = await page.screenshot({ fullPage: true });

    await browser.close();

    // Embed the cover page image into the PDF
    const coverImage = await pdfDoc.embedPng(screenshot);

    // Draw the cover image onto the A4 page
    a4Page.drawImage(coverImage, {
      x: 0,
      y: 0,
      width: PageSizes.A4[0], // A4 width in millimeters
      height: PageSizes.A4[1], // A4 height in millimeters
    });

    const mergedDoc = await PDFDocument.create();
    const copiedCoverPages = await mergedDoc.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    );
    copiedCoverPages.forEach((page) => mergedDoc.addPage(page));

    const attachmentPromises = attachments.map(async (attachmentData) => {
      if (attachmentData.ext === ".pdf") {
        const _attachmentData = await fs.readFile(
          `public${attachmentData.url}`
        );
        const _attachmentDoc = await PDFDocument.load(_attachmentData);
        const copiedAttachmentPages = await mergedDoc.copyPages(
          _attachmentDoc,
          _attachmentDoc.getPageIndices()
        );
        return copiedAttachmentPages.forEach((page) => mergedDoc.addPage(page));
      } else if (
        attachmentData.ext === ".jpg" ||
        attachmentData.ext === ".png"
      ) {
        // Embed images
        const _imageBytes = await fetch(
          `${process.env.CLIENT_URL}${attachmentData.url}`
        ).then((res) => res.arrayBuffer());

        let embeddedImage;

        if (attachmentData.ext === ".jpg") {
          embeddedImage = await mergedDoc.embedJpg(_imageBytes);
        }
        if (attachmentData.ext === ".png") {
          embeddedImage = await mergedDoc.embedPng(_imageBytes);
        }

        const page = mergedDoc.addPage(PageSizes.A4);

        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: PageSizes.A4[0], // A4 width in millimeters
          height: PageSizes.A4[1], // A4 height in millimeters
        });
      }
    });

    await Promise.all(attachmentPromises);

    const pdfBytes = await mergedDoc.saveAsBase64({ dataUri: true });

    return pdfBytes;
  },
}));
