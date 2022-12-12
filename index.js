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
    const user1 = req.body.user1.trim()
    const user2 = req.body.user2.trim()
    const count = req.body.count
    const game = req.body.game
    const offset = req.body.offset
    if (typeof user1 !== "string" || typeof user2 !== "string" 
        || typeof count !== "number" || typeof game !== "string"
        || count % 100 != 0 || count <= 0
        || offset < 0 || (offset != 0 && offset % count != 0)) {
        error(res, "Incorrect body")
        return
    }
    if (equalStrings(user1, user2)) {
        error(res, "Names can't be same")
        return
    }
    if (user1 === "" || user2 === "") {
        error(res, "Names can't be empty")
        return
    }

    // Get user IDs
    let responses = await Promise.all([
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user1}&offset=0&limit=100`),
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user2}&offset=0&limit=100`)
    ])
    if (responses[0].status !== 200 || responses[1].status !== 200) {
        if (responses[1].status === 429) {
            error(res, "Too many requests, retry after " + responses[1].headers.get("retry-after") + " seconds")
            return
        }
        if (responses[0].status !== 200) console.log(`Unknown Error (user1='${user1}'): ` + responses[0].status, responses[0])
        if (responses[1].status !== 200) console.log(`Unknown Error (user2='${user2}'): ` + responses[1].status, responses[1])
        error(res, "Fetch userIDs, codes " + responses[0].status + ", " + responses[1].status)
        return
    }
    let data = await Promise.all(responses.map(r => r.json()))
    if (responses[0].status !== 200 || data[0].items.length == 0 || !equalStrings(data[0].items[0].nickname, user1)) {
        error(res, "Cannot find user '" + user1 + "'")
        return
    }
    if (responses[1].status !== 200 || data[1].items.length == 0 || !equalStrings(data[1].items[0].nickname, user2)) {
        error(res, "Cannot find user '" + user2 + "'")
        return
    }

    // First name in list is a soft match (without capitalization), seek true match
    const user1_id = findUserID(user1, data[0].items)
    const user2_id = findUserID(user2, data[1].items)
    const user1_profile = data[0].items[0]
    const user2_profile = data[1].items[0]

    // Get recent {count} matches for each user
    const queries = []
    for (let i = 0; i*100 < count; i++) {
        queries[i] = fetch(`https://open.faceit.com/data/v4/players/${user1_id}/history?game=${game}&offset=${i*100+offset}&limit=100`)
    }
    responses = await Promise.all(queries)
    data = await Promise.all(responses.map(function(r) {
        if (r.status === 200) {
            return r.json()
        } else {
            return { items: [] }
        }
    }))

    const mutual_matches = []
    let checked_all = false
    let last_game
    for (let i = 0; i*100 < count; i++) {
        if (responses[i].status === 200) {
            // Add mutual games
            data[i].items.forEach(match => {
                if (match.playing_players.includes(user2_id)) {
                    mutual_matches.push(match)
                }
                last_game = match.started_at
            })
            // If not full of games, we've reached the end
            if (data[i].items.length < 100) {
                checked_all = true
                break
            }
        }
    }
    
    res.json({
        user1: user1_profile,
        user2: user2_profile,
        mutual_games: mutual_matches,
        last_game: offset + count,
        checked_all: checked_all,
    })
})

// Problem: Players with same username but different capitalization can exist
// Solution: Compare first 100 users in list, take best fit or first result (can miss a true match if >100 names)
function findUserID(user, data) {
    let user_id
    for (let i = 0; i < data.length; i++) {
        if (data[i].nickname === user) {
            user_id = data[i].player_id
            break
        }
    }
    if (user_id == undefined) user_id = data[0].player_id
    return user_id
}

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