//require('dotenv').config({path:'./../config.env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";

dotenv.config({
    path:'./../config.env'
})

connectDB()



















































































/*import express from 'express'

const app=express()

;(async()=>{
    try{
        await mongoose.connect(`${process.env.DATABASE}/${DB_NAME}`)
        app.on("error",(err)=>{
            console.log('Application not able to connect',err)
            throw err
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is running on port ${process.env.PORT}`)
        })
    }catch(err){
        console.error(`Error received ${err}`)
    }
})()*/