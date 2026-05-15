const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({

ip:String,
country:String,
countryCode:String,
createdAt:{

type:Date,
default:Date.now

}

});

module.exports = mongoose.model(
"Visitor",
visitorSchema
);
