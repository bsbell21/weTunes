/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
// client_id = '530ddf60a0e840369395009076d9fde7', client_secret = 'd1974e81df054fb2bffa895b741f96f6', redirect_uri = 'https://github.com/bsbell21'
// var ip_address = "10.0.1.14" // for local machine
var ip_address = "104.236.166.94" // server ip
// var ip_address = 'ec2-104.236.166.94.compute-1.amazonaws.com'
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '530ddf60a0e840369395009076d9fde7'; // Your client id
var client_secret = 'd1974e81df054fb2bffa895b741f96f6'; // Your client secret
// var redirect_uri = ip_address + ':7777/callback'; // Your redirect uri
var redirect_uri = 'http://' + ip_address + ':7777/callback'; // Your redirect uri


// var client_id = '03ffe0cac0a0401aa6673c3cf6d02ced'; // Your client id
// var client_secret = 'a57c43efb9644574a96d6623fb8bfbc2'; // Your client secret
// var redirect_uri = 'http://localhost:7777/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public user-library-read playlist-read-private playlist-modify-private user-library-modify';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
      show_dialog: true
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  console.log("debnug");
  var code = req.query.code || null;
  var state = req.query.state || null;
  // var storedState = req.cookies ? req.cookies[stateKey] : null;
  var storedState = state;

  if (state === null || state !== storedState) {
    console.log('state == null');
    console.log(state === null);
    console.log('state !== storedState');
    console.log(state !== storedState);
    console.log('state');
    console.log(state);
    console.log('stored state');
    console.log(storedState);
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    console.log('state != null');
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    console.log('got to request.post');
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        console.log('no error');
        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          var user_id = body['id'];
          var display_name = body['display_name'];

        
       // debugger;

        console.log("redirecting to flask");
        // we can also pass the token to the browser to make requests from there
        res.redirect('http://' + ip_address + ':7000/group_login_signin?' +
        // res.redirect('http://104.236.166.94:7000/group_login_signin?' +
        // res.redirect(ip_address + ':7000/group_login_signin?' +
          querystring.stringify({
            user_id: user_id,
            display_name: display_name,
            access_token: access_token,
            refresh_token: refresh_token
          }));
        });
      } else {
        if(error)
          console.log(error); //adding in to throw error

        else 
          console.log('error thrown');


        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
  console.log('end of dubugger');
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 7777');
app.listen(7777);
