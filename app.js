'use strict';

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const REST_PORT = (process.env.PORT || 3000);

const app = express();

// DBCSのSelf Signed Certificateを利用したSSL接続を張る必要があるため。
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


// -----------------------------------------------------------------------------
// ミドルウェア設定
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({
    verify: function(req, res, buf, encoding) {
        req.rawBody = buf;
    }
}));


// -----------------------------------------------------------------------------
// Webサーバー設定
const server = app.listen(REST_PORT, function() {
    console.log('Rest service ready on port ' + REST_PORT);
});


// -----------------------------------------------------------------------------
// Socket IOインスタンスを初期化し、エクスポート（共有）
exports.io = require('socket.io')(server);


// -----------------------------------------------------------------------------
// ルーター設定

const route_webhook = require('./routes/webhook');
const route_personalHistoryDb = require('./routes/personalHistoryDb');
const route_index = require('./routes/index');
app.use('/webhook', route_webhook);
app.use('/personalHistoryDb', route_personalHistoryDb);
app.use('/', route_index);
