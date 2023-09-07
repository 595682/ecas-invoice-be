/**
 * bdc controller
 */

import { factories } from "@strapi/strapi";
const { errors } = require("@strapi/utils");

export default factories.createCoreController("api::bdc.bdc", ({ strapi }) => ({
  async exampleAction(ctx) {
    const BDCId = ctx.params.id;

    if (!BDCId) {
      throw new errors.ValidationError("Missing id param from the request!");
    }

    let foundBDC;

    try {
      foundBDC = await strapi.entityService.findOne("api::bdc.bdc", BDCId, {
        populate: ["concepts", "concepts.attachment"],
      });
    } catch (e) {
      console.error(e);
      throw new errors.NotFoundError("BDC not found!");
    }

    if (!foundBDC) {
      throw new errors.NotFoundError("BDC not found!");
    }

    const attachments =
      foundBDC?.concepts?.map((concept) => concept.attachment) ?? [];

    const attachmentLinks =
      attachments.map((attachment) => attachment.url) ?? [];

    const pdfBytes = await strapi
      .service("api::bdc.bdc")
      .createDocument(attachmentLinks);

    const base64Data = pdfBytes.split(";base64,").pop();
    const filename = "sample.pdf";

    ctx.set("Content-Disposition", `attachment; filename=${filename}`);
    ctx.type = "application/pdf";
    ctx.body = Buffer.from(base64Data, "base64");
  },
}));
