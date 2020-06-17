const express = require("express");
const path = require("path");
const routes = require("./routes");
const bodyParser = require('body-parser');

const middlewares = [
	bodyParser.urlencoded({ extended: true }),
  ];

var app = express(),http = require("http"),server = http.createServer(app);

// Config
const PORT = 5000;

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ limit: '50mb',extended: true }))

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.set("port",PORT);

app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname, 'public')));
app.use(routes);

// launch the http server on given port
server.listen(PORT, () => {
	const addr = server.address();
	console.log(`Server running at port ${addr.port}/`);
});