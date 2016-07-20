
//Get modules.
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var fs = require('fs');
var AWS = require('aws-sdk');
var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.locals.theme = process.env.THEME; //Make the THEME environment variable available to the app. 

//Read config values from a JSON file.
var config = fs.readFileSync('./app_config.json', 'utf8');
config = JSON.parse(config);

//Create DynamoDB client and pass in region.
var db = new AWS.DynamoDB({region: config.AWS_REGION});
//Create SNS client and pass in region.
var sns = new AWS.SNS({ region: config.AWS_REGION});

//GET home page.
app.get('/', routes.index);

//POST signup form.
app.post('/signup', function(req, res) {
  var nameField = req.body.name,
  emailField = req.body.email,
  previewBool = req.body.previewAccess;
  res.send(200);
  signup(nameField, emailField, previewBool);
});

//Add signup form data to database.
var signup = function (nameSubmitted, emailSubmitted, previewPreference) {
  var formData = {
    TableName: config.STARTUP_SIGNUP_TABLE,
    Item: {
      email: {'S': emailSubmitted}, 
      name: {'S': nameSubmitted},
      preview: {'S': previewPreference}
    }
  };
  db.putItem(formData, function(err, data) {
    if (err) {
      console.log('Error adding item to database: ', err);
    } else {
      console.log('Form data added to database.');
      var params = {
        Protocol: 'email',
        TopicArn: config.NEW_SIGNUP_TOPIC,
        Endpoint: formData.Item.email['S']
      };
      sns.subscribe(params, function(err, data) {
        if (err) {
          console.log(err, err.stack); // an error occurred
        } else {
          console.log('Working signup');
          console.log(data);           // successful response
        }   
      });
      
    }
  });
};

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
