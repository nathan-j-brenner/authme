var express = require('express');
var router = express.Router();
var app = require('../app')
var pg = require('pg');
var bluebird = require('bluebird');
var knexConfig = require('../knexfile');
var knex = require('knex')(knexConfig);
var uuid = require('node-uuid');
var redis = require('redis');
var client = redis.createClient();
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

client.on('connect', function(){
  console.log('redis connected');
})  

/*
This is a request handler for loading the main page. It will check to see if a user is logged in, and render the index page either way.
*/
/********************************
if the user has logged in before, the home page for the user will display in the browser
********************************/
router.get('/', function(request, response, next) {
  var username;
  var password;
  var user_id;
  /*
  Check to see if a user is logged in. If they have a cookie called
  "username," assume it contains their username
  */
  if (request.cookies.username && request.cookies.password) {
    username = request.cookies.username;
    password = request.cookies.password;

    knex('feed').where({
      username: username
    }).select('*').then(function(result){
    // knex.select('*').from('feed').then(function(result){ this code will show all tweets
      result.reverse();
      result.forEach(function(str){
        client.lpush('result', JSON.stringify(str));
      })

      client.lrange('result', 0,-1, function(err, strs){
        var objs = strs.map(function(str){
          return JSON.parse(str);
        });
        console.log(objs);
      })
      response.render('main', { mess: result, name: result});
    });
  } else {
    username = null;
    password = null;
    response.render('index', { title: 'Authorize Me!', username: username, password: password});
  }


  // if (request.cookies.username && request.cookies.password) {
  //   username = request.cookies.username;
  //   password = request.cookies.password;
  //   client.set('username', username, function(error, reply){
  //     console.log(username);
  //   client.set('tweet', )
  //   }
  //   knex.select('*').from('feed').then(function(result){
  //     // for(var i = 0;i<result.length; i++){
  //     //   console.log(result[i].username + " said " + "'" +result[i].tweet + "'" + " on " + result[i].posted_at);
  //     // }
  //     // console.log(result.length);
  //     result.reverse();
  //     client.set('tweet_message', result[0], function(error, reply){
  //       console.log(result[0].tweet);
  //     });
  //     console.log(typeof result);
  //     console.log(result.length);
  //     if(result.length<0){

  //     }

  //     response.render('main', { mess: result, name: result});
  //   });
  // } else {
  //   username = null;
  //   password = null;
  //   response.render('index', { title: 'Authorize Me!', username: username, password: password});
  // }

  // router.get('/', function(request, response){
  //   var username, password, user_id, tweet;
  //   if (request.cookies.username){
  //     username = request.cookies.password;
  //     var tweet = request.body.tweet;

  //   }
  // }
  /*
  render the index page. The username variable will be either null
  or a string indicating the username.
  */
  // response.render('index', { title: 'Authorize Me!', username: username, password: password});
});

/*
This is the request handler for receiving a registration request. It will check to see if the password and confirmation match, and then create a new user with the given username.
It has some bugs:
* if someone tries to register a username that's already in use, this handler
  will blithely let that happen.
* If someone enters an empty username and/or password, it'll accept them
  without complaint.
*/
router.post('/register', function(request, response) {
  /*
  request.body is an object containing the data submitted from the form.
  Since we're in a POST handler, we use request.body. A GET handler would use
  request.params. The parameter names correspond to the "name" attributes of
  the form fields.
  app.get('database') returns the knex object that was set up in app.js. app.get
  is not the same as router.get; it's more like object attributes. You could
  think of it like it's saying app.database, but express apps use .get and .set
  instead of attributes to avoid conflicts with the attributes that express apps
  already have.
  */
  var username = request.body.username,
      user_email = request.body.email,
      password = request.body.password,
      password_confirm = request.body.password_confirm,
      database = app.get('database');
  // username authentication, but it's not working
  // knex('users').where('username', username)
  //   .then(function(result){
    
  //     if(result.length>0){
  //       response.render('index', {
  //         title: 'Authorize Me',
  //         user: null,
  //         error: "username already exist"
  //       });
  //   }
  // }
  if (password === password_confirm) {
    /*
    This will insert a new record into the users table. The insert
    function takes an object whose keys are column names and whose values
    are the contents of the record.
    This uses a "promise" interface. It's similar to the callbacks we've
    worked with before. insert({}).then(function() {...}) is very similar
    to insert({}, function() {...});
    */

    var nonce = uuid.v4();
    var transporter = nodemailer.createTransport({
      service: 'yahoo',
      auth: {
        user: 'nbblazer1827@yahoo.com',
        pass: 'b701oMfcwWZtQ85F'
      }
    });
    var mailOptions = {
      from: 'nbblazer1827@yahoo.com',
      to: user_email,
      subject: 'Welcome',
      text: 'You have registed at my site.  Your username is ' + username + 'and your password is ' + password + '. Click <a href=http://localhost:3000/confirm_account/' + nonce + '>here</a> to verify'
    }

    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        console.log(error);
      } else{
        console.log('Message sent: ' + info.response);
      }
    });
    var clientInfo = {
      username: username,
      password: password,
      user_email: user_email
    }
    client.set(nonce, JSON.stringify(clientInfo));
  
  } else {
    /*
    The user mistyped either their password or the confirmation, or both.
    Render the index page again, with an error message telling them what's
    wrong.
    */
    response.render('index', {
      title: 'Error',
      user: null,
      error: "Password didn't match confirmation or that username is already taken"
    });
  }
});

router.get('/confirm_account/:nonce', function(request, response) {
  client.get(request.params.nonce, function(err, clientInfo){
    client.del(request.params.nonce, function(){
      if(clientInfo){
        clientInfo = JSON.parse(clientInfo);
        database = app.get('database');
        console.log(database);
        database('users').insert({
          username: clientInfo.username,
          email: clientInfo.email,
          password: clientInfo.password
          }).returning('username').then(function(user_id){
            response.cookie('username', clientInfo.username);
            response.cookie('password', clientInfo.password);
            response.cookie('user_id', user_id);
          }).then(function(){
            response.redirect('/');
          });
      } else{
        response.render('index', {error: "that verification code is invalid"});
      }
    });
  });
});


/*
This is the request handler for logging in as an existing user. It will check
to see if there is a user by the given name, then check to see if the given
password matches theirs.
Given the bug in registration where multiple people can register the same
username, this ought to be able to handle the case where it looks for a user
by name and gets back multiple matches. It doesn't, though; it just looks at
the first user it finds.
*/
router.post('/login', function(request, response) {
  /*
  Fetch the values the user has sent with their login request. Again, we're
  using request.body because it's a POST handler.
  Again, app.get('database') returns the knex object set up in app.js.
  */
  var username = request.body.username,
      password = request.body.password,
      database = app.get('database');


  /*
  This is where we try to find the user for logging them in. We look them up
  by the supplied username, and when we receive the response we compare it to
  the supplied password.
  */
  database('users').where({'username': username}).then(function(records) {
    /*
    We didn't find anything in the database by that username. Render the index
    page again, with an error message telling the user what's going on.
    */
    if (records.length === 0) {
        response.render('index', {
          title: 'Error!',
          user: null,
          error: "No such user"
        });
    } else {
      var user = records[0];
      if (user.password === password) {
        /*
        Hey, we found a user and the password matches! We'll give the user a
        cookie indicating they're logged in, and redirect them to the root path,
        where the GET request handler above will look at their cookie and
        acknowledge that they're logged in.
        */
        response.cookie('username', username);
        response.cookie('password', password);
        response.redirect('/');
      } else {
        /*
        There's a user by that name, but the password was wrong. Re-render the
        index page, with an error telling the user what happened.
        */
        response.render('index', {
          title: 'Authorize Me!',
          user: null,
          error: "Password incorrect"
        });
      }
    }
  });
});

//tweet feed
router.post('/tweet', function(request, response) {
  //when you add text to the tweet field and click tell everyone; the tweet messsage is saved in tweet
  //need to add user id in reference to who is using it and posted_at as timestamp
  // if(tweet.length<0){
    var tweet = request.body.tweet;
    var user_id = request.cookies.user_id;
    var username = request.cookies.username;
    var database  = app.get('database');
    database('feed').insert({
      tweet: tweet,
      user_id: user_id,
      username: username
    }).then(function(){
      response.redirect('/');
    });
    // }).then(function(result){
    //   knex.column('tweet').select().from('feed');
    // }).then(function(result){ 
    //   response.redirect('/');
    // });
});

router.post('/logout', function(request, response){
  console.log('clear my cookies');
  response.clearCookie('username');
  response.clearCookie('password');
  response.clearCookie('user_id');
  response.redirect('/');
})

module.exports = router;