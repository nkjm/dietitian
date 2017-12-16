"use strict";

require("dotenv").config();

/*
** Import Packages
*/
const express = require("express");
const session = require("express-session");
const app = express();
const path = require('path');
const favicon = require('serve-favicon');
const bot_express = require("bot-express");

/*
** Import routes
*/
const route_personDb = require('./routes/personDb');
const route_dashboard = require("./routes/dashboard");
const route_oauth = require("./routes/oauth");
const route_push = require("./routes/push");


/*
** Middleware Configuration
*/
const server = app.listen(process.env.PORT || 5000, () => {
    console.log(`server is listening to ${process.env.PORT || 5000}...`);
});

// Instantiate socket.io and export it
exports.io = require('socket.io')(server);

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.use(session({
    secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    resave: false,
    saveUninitialized: false
}));
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
app.use('/personDb', route_personDb);
app.use("/dashboard", route_dashboard);
app.use("/oauth", route_oauth);
app.use("/push", route_push);
app.get("/", (req, res) => {
    return res.render("login");
});

module.exports = app;
