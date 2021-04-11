'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {


  /**
   * Update a record.
   *
   * @return {Object}
   */

   async update(ctx) {
    const decrypted = await strapi.plugins[
      'users-permissions'
    ].services.jwt.getToken(ctx);
    const { id } = ctx.params;
    const logData = {};
    logData.name = decrypted._doc["FirstName"] + " " + decrypted._doc["LastName"];
    logData.action="Update setting";

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      logData.data = JSON.stringify(data);
      strapi.services['log'].create(logData)
      entity = await strapi.services['setting'].update({ id }, data, {
        files,
      });
    } else {
      logData.data = JSON.stringify(ctx.request.body);
      strapi.services['log'].create(logData)
      entity = await strapi.services['setting'].update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.services['setting'] });
  }
};
