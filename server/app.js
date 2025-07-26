import express from 'express';
import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import {Server} from 'socket.io';


// http server and express app

const app = express();
const server = http.createServer(app);

//Initialize socket.io server

export const io = new Server(server, {
    cors: {origin: "*"}
});

// Store online users

export const userSocketMap = {}; // {userId : socketId}

// socket.io connection handler

io.on("connection", (socket)=>{
    const userId = socket.handshake.query.userId;
    console.log("User connected", userId);
    if(userId) userSocketMap[userId] = socket.id;
    // Emit online users to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    socket.on("disconnected", ()=>{
        console.log("User disconnected", userId);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
    })
    
})

// Middleware setup

app.use(cors());
app.use(express.json({limit : '4mb'}));

// Route setup

app.use('/api/status', (req, res)=> res.send("Server is live"));
app.use('/api/auth', userRouter);
app.use('/api/messages', messageRouter);

// Connect to DB

await connectDB();


const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=> console.log("Server is running on PORT : " + PORT));
