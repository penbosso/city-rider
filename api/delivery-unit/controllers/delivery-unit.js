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
    console.log(decrypted._doc.Role)

    let entities;
    if(decrypted._doc.Role ==="user") {
      entities = await strapi.services['delivery-unit'].find({user:decrypted._doc._id, status_nin: ['cancelled', 'delivered'] });
    } else {
      entities = await strapi.services['delivery-unit'].find({riderId:decrypted._doc._id, status_nin: ['cancelled', 'delivered'] });
    }
    entities = entities.filter(entity => {
      if(entity.riderId && entity.riderId !='') return true;
      return false;
    })
    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models['delivery-unit'] })).reverse();
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
    let entities;
    if(decrypted._doc.Role ==="user") {
      entities = await strapi.services['delivery-unit'].find({user:decrypted._doc._id, status_in: ['cancelled', 'delivered'], _sort: 'createdAt:desc'});
    } else {
      entities = await strapi.services['delivery-unit'].find({riderId:decrypted._doc._id, status_in: ['cancelled', 'delivered'], _sort: 'createdAt:desc'});
    }
    entities = entities.filter(entity => {
      if(entity.riderId && entity.riderId !='') return true;
      return false;
    })

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

    let distance = 10
    if (ctx.request.body.matrix && ctx.request.body.matrix.rows) {
      distance = parseFloat(ctx.request.body.matrix.rows[0]["elements"][0]["distance"]["value"]);
      console.log('snap distance ->', distance)
    } else {
      return { statusCode: 400,
        error: 'Bad data',
        message: 'Could not get distance between locations. Please try again' };
      }

    ctx.request.body.status = "pending";
    const settings = await strapi.services.setting.findOne({ id:"604e9d1cc687f574e8e1c3c5" });
    ctx.request.body.cost = calculateCost(distance, settings.pricePerKm, settings.basePrice);
    let entity = await strapi.services['delivery-unit'].create(ctx.request.body);

    return sanitizeEntity({_id: entity._id, cost: entity.cost}, { model: strapi.models['delivery-unit'] });
  },

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
    logData.action="updated delivery item";

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      logData.data = JSON.stringify(data);
      strapi.services['log'].create(logData)
      entity = await strapi.services['delivery-unit'].update({ id }, data, {
        files,
      });
    } else {
      logData.data = JSON.stringify(ctx.request.body);
      strapi.services['log'].create(logData)
      entity = await strapi.services['delivery-unit'].update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models['delivery-unit'] });
  },

  /**
   * Delete a record.
   *
   * @return {Object}
   */

   async delete(ctx) {
    const decrypted = await strapi.plugins[
      'users-permissions'
    ].services.jwt.getToken(ctx);
    const { id } = ctx.params;
    const logData = {};
    logData.name = decrypted._doc["FirstName"] + " " + decrypted._doc["LastName"];
    logData.action="deleted delivery item";


    const entity = await strapi.services['delivery-unit'].delete({ id });
    logData.data = JSON.stringify(entity);
    strapi.services['log'].create(logData)

    return sanitizeEntity(entity, { model: strapi.models['delivery-unit'] });
  },

};

// one km is equivalent to 1 ghc, 100 unit of duration is to 1 ghc
const calculateCost = (distance, pricePerKm, basePrice) => Math.ceil(basePrice + pricePerKm * distance)
