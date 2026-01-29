import express from 'express'
import dotenv from 'dotenv'
import http from 'http'
import axios from 'axios'
import { Server } from 'socket.io'

dotenv.config()
const port = process.env.PORT || 5000
const app = express()
app.use(express.json())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: process.env.NEXT_BASE_URL
    }
})

io.on("connection", (socket) => {
    console.log("user connected", socket.id)
    // both identity and update-location are emitted from GeoUpdater.tsx component
    socket.on("identity", async (userId) => {
        console.log(userId)
        await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/connect`, { userId, socketId: socket.id })
        console.log("request sent !!!")
    })

    socket.on("update-location", async ({ userId, latitude, longitude }) => {
        const location = {
            type: "Point",
            coordinates: [longitude, latitude]
        }
        await axios.post(`${process.env.NEXT_BASE_URL}/api/socket/update-location`, { userId, location })
        io.emit("update-deliveryBoy-location", { userId, location })
    })

    socket.on("join-room", (roomId) => {
        console.log("room created with room id ",roomId)
        socket.join(roomId)
    })

    socket.on("send-message", async(message) => {
        console.log(message)
        await axios.post(`${process.env.NEXT_BASE_URL}/api/chat/save`,message)
        // again emitting message to room with id === orderId and we will listen this in deliverychat 
        io.to(message.roomId).emit("send-message", message)
    })

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id)
    })
})

app.post("/notify", (req, res) => {
    const { event, data, socketId } = req.body
    if (socketId) {
        io.to(socketId).emit(event, data)
    } else {
        io.emit(event, data)
    }

    return res.status(200).json({ "success": true })
})


server.listen(port, () => {
    console.log("server started at", port)
})