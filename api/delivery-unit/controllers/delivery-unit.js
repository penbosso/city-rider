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

    let entities = await strapi.services['delivery-unit'].find({user:decrypted._doc._id, status_nin: ['cancelled', 'delivered'] });

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models['delivery-unit'] }));
  },

  async statistics() {
    // all delivery
    const entities = await strapi.services['delivery-unit'].find();
    const data = {};
    data.totalCost = entities.reduce((total, entity)=> {
      return total + entity.cost;
    },0);

    data.itemsDelivered = entities.filter(entity => entity.status == 'delivered').length;
    data.itemsPending = entities.filter(entity => entity.status != 'delivered' || entity.status != 'cancelled').length
    data.itemsCancelled = entities.filter(entity => entity.status == 'cancelled').length
    data.allDeliveries = entities.length;


    // todays delivery
    let today = new Date().toISOString().slice(0, 10)
    const todaysEntities = entities.filter(entity => entity.updatedAt.toISOString().slice(0, 10) == today);
    data.totalCostToday = todaysEntities.reduce((total, entity)=> {
      return total + entity.cost;
    },0);
    data.itemsDeliveredToday = todaysEntities.filter(entity => entity.status == 'delivered').length;
    data.itemsPendingToday = todaysEntities.filter(entity => entity.status != 'delivered' || entity.status != 'cancelled').length
    data.itemsCancelledToday = todaysEntities.filter(entity => entity.status == 'cancelled').length
    data.allDeliveriesToday = todaysEntities.length;

    // This months delivery
    let monthDate = new Date();
    const monthEntities = entities.filter(entity => entity.updatedAt.getFullYear() == monthDate.getFullYear() && entity.updatedAt.getMonth() == monthDate.getMonth())
    data.totalCostMonth = monthEntities.reduce((total, entity)=> {
      return total + entity.cost;
    },0);
    data.itemsDeliveredMonth = monthEntities.filter(entity => entity.status == 'delivered').length;
    data.itemsPendingMonth = monthEntities.filter(entity => entity.status != 'delivered' || entity.status != 'cancelled').length
    data.itemsCancelledMonth = monthEntities.filter(entity => entity.status == 'cancelled').length
    data.allDeliveriesMonth = monthEntities.length;

    return data;
  },

  async userDelivery(ctx) {
    // use the current user id from the JWT in the header
    const decrypted = await strapi.plugins[
      'users-permissions'
    ].services.jwt.getToken(ctx);
    let entities = await strapi.services['delivery-unit'].find({user:decrypted._doc._id});


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

    if(ctx.request.body.matrixBug) {
      const duration = ctx.request.body.matrix.durations[0][0] + ctx.request.body.matrix.durations[0][1];
      const distances = ctx.request.body.matrix.durations[0][0] + ctx.request.body.matrix.distances[0][1];

      ctx.request.body.estimatedTime = duration;
      ctx.request.body.distance = distances;
    }
    ctx.request.body.status = "pending";
    ctx.request.body.distance? '' : ctx.request.body.distance = 10;
    ctx.request.body.estimatedTime? '' : ctx.request.body.estimatedTime = 20;
    ctx.request.body.cost = calculateCost(ctx.request.body.distance,ctx.request.body.estimatedTime);
    let entity = await strapi.services['delivery-unit'].create(ctx.request.body);

    return sanitizeEntity({_id: entity._id, cost: entity.cost}, { model: strapi.models['delivery-unit'] });
  },
};

// one km is equivalent to 1 ghc, 100 unit of duration is to 1 ghc
const calculateCost = (distance, estimatedTime) => 20 + 0.1 * distance + 0.01 * estimatedTime
