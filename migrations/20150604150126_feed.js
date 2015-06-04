exports.up = function(knex, Promise) {
  return knex.schema.createTable('feed', function(table) {
    table.integer('user_id');
    table.string('tweet');
    table.timestamp('posted_at');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('feed');
};