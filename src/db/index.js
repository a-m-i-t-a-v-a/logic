//import dotenv from 'dotenv';
//dotenv.config({ path: './../../config.env' });
import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB=async()=>{
    try{
        console.log(process.env.DATABASE)
        const connectionInstance=await mongoose.connect(`${process.env.DATABASE}/${DB_NAME}`)
        console.log(`\n Mongodb connected!! DB host : ${connectionInstance.connection.collection}`)
    }catch(err){
        console.log('Mongodb connection error',err)
        process.exit(1)
    }
}

export default connectDB