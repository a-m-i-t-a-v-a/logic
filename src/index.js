//require('dotenv').config({path:'./../config.env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8010, ()=>{
        console.log(`Server is running at port ${process.env.PORT}`)
    })
})
.catch((err)=>console.error(`Mongodb error : rotten mango ${err}`))



















































































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