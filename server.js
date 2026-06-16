require("dotenv").config();
const connectDB = require("./src/config/db");
const app = require("./src/app");
const PORT = process.env.PORT;


connectDB();
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT} `)
})