const node_fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { response } = require("express");
const express = require("express")
require("dotenv").config()
const PORT = process.env.PORT
const API_KEY = process.env.API_KEY

const app = express()
app.use(express.json())

app.listen(PORT, () => {
    console.log("Starting server at port " + PORT)
})
app.use(express.static("public"))



app.post("/mutualGames", async (req, res) => {
    console.log("Incoming request /mutualGames:", req.body)
    const user1 = req.body.user1
    const user2 = req.body.user2
    const count = req.body.count
    const game = req.body.game
    if (typeof user1 !== "string" || typeof user2 !== "string" 
        || typeof count !== "number" || typeof game !== "string"
        || count % 100 != 0 || count <= 0) {
        error(res, "Incorrect body")
        return
    }

    // Get user IDs
    let responses = await Promise.all([
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user1}&offset=0&limit=1`),
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user2}&offset=0&limit=1`)
    ])
    if (responses[0].status !== 200 || responses[1].status !== 200) {
        if (responses[1].status === 429) {
            error(res, "Too many requests, retry after " + responses[1].headers.get("retry-after") + " seconds")
            return
        }
        console.log("Unknown Error " + responses[0].status, responses[0])
        error(res, "Fetch userIDs, codes " + responses[0].status + ", " + responses[1].status)
        return
    }
    let data = await Promise.all(responses.map(r => r.json()))
    if (responses[0].status !== 200 || data[0].items.length == 0 || !equalStrings(data[0].items[0].nickname, user1)) {
        error(res, "User '" + user1 + "' doesn't exist")
        return
    }
    if (responses[1].status !== 200 || data[1].items.length == 0 || !equalStrings(data[1].items[0].nickname, user2)) {
        error(res, "User '" + user2 + "' doesn't exist")
        return
    }
    const user1_id = data[0].items[0].player_id
    const user2_id = data[1].items[0].player_id

    // Get recent {count} matches for each user
    const queries = []
    for (let i = 0; i*100 < count; i++) {
        queries[i] = fetch(`https://open.faceit.com/data/v4/players/${user1_id}/history?game=${game}&offset=${i*100}&limit=100`)
        queries[count/100 + i] = fetch(`https://open.faceit.com/data/v4/players/${user2_id}/history?game=${game}&offset=${i*100}&limit=100`)
    }
    responses = await Promise.all(queries)
    data = await Promise.all(responses.map(function(r) {
        if (r.status === 200) {
            return r.json()
        } else {
            return undefined
        }
    }))

    let user1_matches = []
    let user2_matches = []
    for (let i = 0; i*100 < count; i++) {
        if (responses[i].status === 200) user1_matches = user1_matches.concat(data[i].items)
        if (responses[count/100 + i].status === 200) user2_matches = user2_matches.concat(data[count/100 + i].items)
    }

    const mutual_matches = []
    let c1 = 0, c2 = 0
    while (c1 < user1_matches.length && c2 < user2_matches.length) {
        if (user1_matches[c1].started_at > user2_matches[c2].started_at) {
            c1++
        } else if (user1_matches[c1].started_at < user2_matches[c2].started_at) {
            c2++
        } else {
            if (user1_matches[c1].match_id === user2_matches[c2].match_id) {
                mutual_matches.push(user1_matches[c1])
            }
            c1++
            c2++
        }
    }
    console.log(mutual_matches.length)
    res.json(mutual_matches)
})

function error(res, message) {
    res.status(400)
    res.json("Error: " + message)
}

function equalStrings(string1, string2) {
    return string1.toLowerCase() === string2.toLowerCase()
}

async function fetch(req) {
    return node_fetch(req, {
        method: "GET",
        headers: { 
            "accept": "application/json", 
            "Authorization": "Bearer " + API_KEY
        }
    })
}