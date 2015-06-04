exports.up = function(knex, Promise) {
  return knex.schema.createTable('feed', function(table) {
    table.integer('user_id').notnullable();
    table.string('body').notnullable();
    table.timestamp('posted_at').notnullable();
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('feed');
};
