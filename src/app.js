const express = require("express")
const cookieParser=require("cookie-parser")



const app = express();

app.use(express.json());
app.use(cookieParser());

// app.use((req, res, next) => {
//   if (["POST", "PUT", "PATCH"].includes(req.method) && req.body === undefined) {
//     return res.status(400).json({
//       message:
//         "Request body is required. Set header Content-Type: application/json and send a JSON body.",
//     });
//   }
//   next();
// });



/**
 * -Routes is requires here
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */

app.get("/",(req,res)=>{
  res.send( "Ledger Service is up and running")
})

app.use("/api/auth",authRouter);
app.use("/api/accounts",accountRouter);
app.use("/api/transactions",transactionRoutes);

module.exports = app;