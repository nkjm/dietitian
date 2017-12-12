"use strict";

/*
** Import Packages
*/
const express = require("express");
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const bot_express = require("bot-express");

/*
** Import routes
*/
const route_dietitianConsole = require('./routes/dietitianConsole');
const route_personalHistoryDb = require('./routes/personalHistoryDb');
const route_personDb = require('./routes/personDb');
const route_index = require('./routes/index');


/*
** Middleware Configuration
*/
const server = app.listen(process.env.PORT || 5000, () => {
    console.log("server is running...");
});

// Instantiate socket.io and export it
exports.io = require('socket.io')(server);

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(__dirname + '/public/images/favicon.ico'));


/*
** Mount bot-express
*/
app.use("/webhook", bot_express({
    nlu: {
        type: "dialogflow",
        language: "ja",
        options: {
            client_access_token: process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN,
            developer_access_token: process.env.DIALOGFLOW_DEVELOPER_ACCESS_TOKEN
        }
    },
    memory: {
        type: "memory-cache",
        retention: 600
    },
    line_channel_secret: process.env.LINE_CHANNEL_SECRET,
    line_access_token: process.env.LINE_ACCESS_TOKEN,
    default_skill: process.env.DEFAULT_SKILL,
    google_project_id: process.env.GOOGLE_PROJECT_ID,
    auto_translation: process.env.AUTO_TRANSLATION
}));
/*
** Mount other routes
*/
app.use('/dietitianConsole', route_dietitianConsole);
app.use('/personalHistoryDb', route_personalHistoryDb);
app.use('/personDb', route_personDb);
app.use('/', route_index);

module.exports = app;
