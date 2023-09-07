/**
 * bdc service
 */

const fs = require("fs/promises");
const puppeteer = require("puppeteer");
import { factories } from "@strapi/strapi";
import { degrees, PageSizes, PDFDocument, rgb, StandardFonts } from "pdf-lib";

module.exports = factories.createCoreService("api::bdc.bdc", ({ strapi }) => ({
  async createDocument(attachmentUrls = []) {
    const pdfDoc = await PDFDocument.create();

    // Create a new page with A4 dimensions (210 x 297 mm)
    const a4Page = pdfDoc.addPage(PageSizes.A4);
    // Fetch the cover page screenshot with print CSS query
    const screenshotUrl = "https://google.com"; // Replace with the URL you want to capture

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 794, height: 1123 });

    // Set viewport to emulate "print" media type
    await page.emulateMediaType("print");

    await page.goto(screenshotUrl, {
      waitUntil: "networkidle2", // Wait until no more than 2 network connections are active
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

    const attachmentPDFs = await Promise.all(
      attachmentUrls.map(async (attachmentUrl) => {
        const _attachmentData = await fs.readFile(`public${attachmentUrl}`);
        const _attachmentDoc = await PDFDocument.load(_attachmentData);
        return _attachmentDoc;
      })
    );

    const mergedDoc = await PDFDocument.create();
    const copiedCoverPages = await mergedDoc.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices()
    );
    copiedCoverPages.forEach((page) => mergedDoc.addPage(page));

    await Promise.all(
      attachmentPDFs.map(async (attachmentPDF) => {
        const copiedAttachmentPages = await mergedDoc.copyPages(
          attachmentPDF,
          attachmentPDF.getPageIndices()
        );
        copiedAttachmentPages.forEach((page) => mergedDoc.addPage(page));
      })
    );

    // const copiedPagesB = await mergedDoc.copyPages(
    //   attachmentDoc,
    //   attachmentDoc.getPageIndices()
    // );
    // copiedPagesB.forEach((page) => mergedDoc.addPage(page));

    const pdfBytes = await mergedDoc.saveAsBase64({ dataUri: true });

    return pdfBytes;
  },
}));
