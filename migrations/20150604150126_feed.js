exports.up = function(knex, Promise) {
  return knex.schema.createTable('feed', function(table) {
    table.increments('tweet_id');
    table.string('tweet');
    table.timestamp('posted_at').defaultTo(knex.raw('now()'));
    table.string('user_id');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('feed');
};