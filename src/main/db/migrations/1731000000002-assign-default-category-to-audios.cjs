'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const [category] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE name = 'Default'",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let categoryId;
    if (category) {
      categoryId = category.id;
    } else {
      categoryId = uuidv4();
      await queryInterface.bulkInsert('categories', [{
        id: categoryId,
        name: 'Default',
        created_at: new Date(),
        updated_at: new Date()
      }]);
    }

    await queryInterface.bulkUpdate('audios',
      { category_id: categoryId },
      { category_id: null }
    );
  },

  async down (queryInterface, Sequelize) {
    const [category] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE name = 'Default'",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (category) {
      await queryInterface.bulkUpdate('audios',
        { category_id: null },
        { category_id: category.id }
      );
    }
  }
};
