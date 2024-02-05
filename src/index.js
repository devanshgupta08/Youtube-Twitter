import dotenv from "dotenv";
import connectDB from "./db/connection.js"
import {app} from "./app.js"

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on("error",(err) =>{
        console.log("Express Error",err);
    })
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Listning on port ${process.env.PORT || 3000}`);
    })
})
.catch((err) =>{
    console.log("Mongo connection error ",err);
})

