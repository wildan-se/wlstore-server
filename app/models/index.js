// app/models/index.js
const dbConfig = require("../../config/db.config");
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;
db.url = dbConfig.url;

db.products = require("./product.model")(mongoose);
db.orders = require("./order.model")(mongoose);
db.users = require("./user.model")(mongoose); // Tambahkan model User

module.exports = db;
