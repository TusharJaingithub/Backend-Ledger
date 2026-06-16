const mongoose = require("mongoose");


function connectDB(){
    
    mongoose.connect(process.env.MONGODB_URI)
    .then(()=>{
        console.log("MongoDB connected successfully");
    })
    .catch((err)=>{
        console.log("Error connecting to DB");
        console.error(err);
        process.exit(1);
    })
}

module.exports = connectDB;