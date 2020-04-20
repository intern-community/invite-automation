const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const config = require('./config');
const request = require('request');
const airtable = require('airtable');
const cors = require('cors')
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cors());

const base = new airtable({apiKey: config.airtableKey}).base(config.airtableBaseId);

app.post('/invite', function(req, res) {
  // Post information to Airtable base
  const city = (id) => ({
    "sf": {
      baseName: "SF Interns",
      slackUrl: config.slackurlSF,
      slackToken: config.slacktokenSF,
    },
    "nyc": {
      baseName: "NYC Interns",
      slackUrl: config.slackurlNYC,
      slackToken: config.slacktokenNYC,
    },
    "sea": {
      baseName: "SEA Interns",
      slackUrl: config.slackurlSEA,
      slackToken: config.slacktokenSEA,
    },
    "ic": {
      baseName: "ICUSERS",
      slackUrl: config.slackurlIC,
      slackToken: config.slacktokenIC,
    }
  })[id]

  base(city(req.body.id).baseName).create({
      "Name": req.body.name,
      "Email": req.body.email,
      "Company": req.body.company,
      "School": req.body.school,
  }, (err, record) => {
      if (err) {
          console.error(err);
          return;
      }
  });

  // Post data to the slack endpoint
  request.post({
      url: 'https://' + city(req.body.id).slackUrl + '/api/users.admin.invite',
      form: {
          email: req.body.email,
          name: req.body.name,
          token: city(req.body.id).slackToken,
          set_active: true,
      },
  }, (err, httpResponse, body) => {
      if (err) return res.send('error: ' + err);
      const parsed_body = JSON.parse(body);
      if (parsed_body.ok) {
          res.send('ok');
      } else {
          let error = parsed_body.error;
          if (error === 'already_invited' || error === 'already_in_team') {
              res.send('existing');
              return '';
          } else if (error === 'invalid_email') {
              error = 'invalid email';
          } else if (error === 'invalid_auth') {
              error = 'invalid authentication';
          }
          res.send('failed: ' + error)
      }
      return '';
  });
});

module.exports = app;
