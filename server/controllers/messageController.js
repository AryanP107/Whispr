import { userSocketMap } from "../app.js";
import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// Get all the users except Logged in User 

export const getUserForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne : userId}}).select("-password");
        
        // Count number of messages not seen

        const unseenMessages = {}
        const promises = filteredUsers.map(async (user) => {
            const messages = await Message.find({senderId: user._id, receiverId: userId, seen: false});
            if(messages.length > 0){
                unseenMessages[user._id] = messages.length;
            }
        })
        await Promise.all(promises);
        res.json({success: true, users: filteredUsers, unseenMessages});
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

// Get all message for selected User

export const getMessages = async (req, res) => {
    try {
        const {id: seletedUserId} = req.params;
        const myId = req.user._id;
        const messages = await Message.find({
            $or: [
                {senderId: myId, receiverId: seletedUserId},
                {senderId: seletedUserId, receiverId: myId},
            ]
        })
        await Message.updateMany({senderId: seletedUserId, receiverId: myId}, {seen: true});
        res.json({success: true, messages});
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message});
    }
}

// Api to mark messages as seen using message id

export const markMessageAsSeen = async (req, res) => {
    try {
        const {id} = req.params;
        await Message.findByIdAndUpdate(id, {seen: true});
        res.json({success: true});
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Send message to selected user

export const sendMessage = async (req, res) => {
    try {
        const {text, img} = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;
        let imgUrl;
        if(img){
            const uploadResponse = cloudinary.uploader.upload(img);
            imgUrl = (await uploadResponse).secure_url;
        }
        const newMessage = Message.create({
            senderId,
            receiverId,
            text,
            image: imgUrl
        })
        // Emit the new message to the receiver's socket
        const receiverSocketId = userSocketMap[receiverId]
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage)
        }


        res.json({success: true, newMessage});
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

