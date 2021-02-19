'use strict';

const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  /**
   * delivery unittes that are not yet delivered or cancelled.
   *
   * @return {Object}
   */
  active: async ctx => {
    // use the current user id from the JWT in the header
    const decrypted = await strapi.plugins[
      'users-permissions'
    ].services.jwt.getToken(ctx);

console.log(decrypted._doc._id,'------------------------------------------');
    let entities = await strapi.services['delivery-unit'].find({ status_nin: ['cancelled', 'delivered'] });

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models['delivery-unit'] }));
  },
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    // use the current user id from the JWT in the header
    const decrypted = await strapi.plugins[
      'users-permissions'
    ].services.jwt.getToken(ctx);
    ctx.request.body.user = decrypted._doc._id;

    if(ctx.request.body.matrix) {
      const duration = ctx.request.body.matrix.durations[0][0] + ctx.request.body.matrix.durations[0][1];
      const distances = ctx.request.body.matrix.durations[0][0] + ctx.request.body.matrix.distances[0][1];

      ctx.request.body.estimatedTime = duration;
      ctx.request.body.distance = distances;
    }
    ctx.request.body.distance? '' : ctx.request.body.distance = 10;
    ctx.request.body.estimatedTime? '' : ctx.request.body.estimatedTime = 20;
    ctx.request.body.cost = calculateCost(ctx.request.body.distance,ctx.request.body.estimatedTime);
    let entity = await strapi.services['delivery-unit'].create(ctx.request.body);

    return sanitizeEntity({_id: entity._id, cost: entity.cost}, { model: strapi.models['delivery-unit'] });
  },
};

// one km is equivalent to 1 ghc, 100 unit of duration is to 1 ghc
const calculateCost = (distance, estimatedTime) => 20 + 0.1 * distance + 0.01 * estimatedTime
