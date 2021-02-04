'use strict';

const { sanitizeEntity } = require('strapi-utils');
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    ctx.request.body.distance? '' : ctx.request.body.distance = 10;
    ctx.request.body.estimatedTime? '' : ctx.request.body.estimatedTime = 20;
    ctx.request.body.cost = calculateCost(ctx.request.body.distance,ctx.request.body.estimatedTime);
    let entity = await strapi.services['delivery-unit'].create(ctx.request.body);

    return sanitizeEntity({_id: entity._id, cost: entity.cost}, { model: strapi.models['delivery-unit'] });
  },
};

const calculateCost = (distance, estimatedTime) => 20 + 0.1 * distance + 0.15 * estimatedTime
