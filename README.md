# authme
A site you can log into and out of

to start redis server: redis-server
to start postgresql: postgres -D /usr/local/var/postgres
to start express server: npm start
to go into the database: psql authme, table is users

migrations:
`npm bin`/knex migrate:latest
	this will  update the postgresql with the changes made in migrations
`npm bin`/knex migrate:rollback
	this will clear all the data in this database