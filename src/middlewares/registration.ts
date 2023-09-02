module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    await next();
    // only if path was register with newsletter param and it was successfull. Then we will put user in the mailing list.
    if (
      ctx.request.url === "/api/auth/local/register" &&
      ctx.response.status === 200
    ) {
      const id = ctx.response.body.user.id;
      // we do NOT await this. it has nothing to with account creation and should not block it. just a side effect.

      let entity = ctx.response.body.user;

      if (ctx.request.body.isApprover) {
        try {
          entity = await strapi.entityService.update(
            "plugin::users-permissions.user",
            id,
            { data: { role: 3 } }
          );
        } catch (e) {
          console.log(e);
        }
      }
    }

    /*     console.log("Send out the success email"); */
  };
};
