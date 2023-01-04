const node_fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const { response } = require("express");
const express = require("express")
require("dotenv").config()
const PORT = process.env.PORT
const API_KEY = process.env.API_KEY

const app = express()
app.use(express.json())
app.use(express.static("public"))

app.listen(PORT, () => {
    console.log("Starting server at port " + PORT)
})

app.use("/viewer-home", express.static("viewer-home"))
app.use("/viewer-match", express.static("viewer-match"))
app.set('view engine', 'ejs');

app.get("/viewer", (req, res) => {
    res.render("home")
})
app.get("/viewer/:matchId", (req, res) => {
    res.render("match", {
        matchId: req.params.matchId
    })
})

/**
 * Request body: {
 *      user1: Nickname of user1,
 *      user2: Nickname of user2,
 *      count: Amount of games to check, starting before last_time, is multiple of 100,
 *      game: Game ID, i.e. "lol_EUW", "csgo", "lol_EUN", etc.
 *      last_time: The timestamp (Unix time) as higher bound of the query
 * }
 */
app.post("/mutualGames", async (req, res) => {
    console.log("Incoming request /mutualGames:", req.body)
    const count = req.body.count
    const game = req.body.game
    const last_time = req.body.last_time

    const [status, msg] = validInput(req.body.user1, req.body.user2, count, game, last_time)
    if (status !== 200) {
        error(res, msg)
        return
    }
    const user1 = req.body.user1.trim()
    const user2 = req.body.user2.trim()

    const [user1_profile, user2_profile, code] = await getUserProfiles(res, user1, user2)
    if (code !== 200) return
    const [user1_id, user2_id] = [user1_profile.player_id, user2_profile.player_id]

    // Get recent {count} matches for each user
    const queries = []
    for (let i = 0; i*100 < count; i++) {
        queries[i] = fetch(`https://open.faceit.com/data/v4/players/${user1_id}/history?game=${game}&from=0&to=${last_time}&offset=${i*100}&limit=100`)
    }
    const responses = await Promise.all(queries)
    const data = await Promise.all(responses.map(function(r) {
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
                if (match.max_players === match.teams_size*2) { // Skip "bye" matches
                    if (match.playing_players.includes(user2_id)) {
                        let team1 = match.teams.faction1.players.map(p => p.player_id)
                        let team2 = match.teams.faction2.players.map(p => p.player_id)
                        let same_team = team1.includes(user1_id) && team1.includes(user2_id)
                            || team2.includes(user1_id) && team2.includes(user2_id)
                        mutual_matches.push({
                            same_team: same_team,
                            match: match
                        })
                    }
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
        checked_all: checked_all,
        checked_last: last_game,
    })
})

app.post("/getMatchInfo", async (req, res) => {
    console.log("Incoming request /getMatchInfo:", req.body)
    const response = await fetch("https://open.faceit.com/data/v4/matches/" + req.body.matchId)
    if (response.status !== 200) {
        error(res, response.statusText)
        return
    }
    const data = await response.json()
    res.json(data)
})

app.post("/getMatchStats", async (req, res) => {
    console.log("Incoming request /getMatchStats:", req.body)
    const response = await fetch("https://open.faceit.com/data/v4/matches/" + req.body.matchId + "/stats")
    if (response.status !== 200) {
        error(res, response.statusText)
        return
    }
    const data = await response.json()
    res.json(data)
})

function validInput(user1, user2, count, game, last_time) {
    if (typeof user1 !== "string" || typeof user2 !== "string" 
        || typeof count !== "number" || typeof game !== "string"
        || count % 100 != 0 || count <= 0
        || last_time < 0) {
        return [400, "Incorrect body"]
    }
    if (equalStrings(user1, user2)) return [400, "Names can't be same"]
    if (user1 === "" || user2 === "") return [400, "Names can't be empty"]

    return [200, null]
}

async function getUserProfiles(res, user1, user2) {
    // Get user IDs
    const responses = await Promise.all([
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user1}&offset=0&limit=100`),
        fetch(`https://open.faceit.com/data/v4/search/players?nickname=${user2}&offset=0&limit=100`)
    ])
    if (responses[0].status !== 200 || responses[1].status !== 200) {
        if (responses[1].status === 429) {
            error(res, "Too many requests, retry after " + responses[1].headers.get("retry-after") + " seconds")
            return [null, null, 400]
        }
        if (responses[0].status !== 200) console.log(`Unknown Error (user1='${user1}'): ` + responses[0].status, responses[0])
        if (responses[1].status !== 200) console.log(`Unknown Error (user2='${user2}'): ` + responses[1].status, responses[1])
        error(res, "Fetch userIDs, codes " + responses[0].status + ", " + responses[1].status)
        return [null, null, 400]
    }
    const data = await Promise.all(responses.map(r => r.json()))
    if (responses[0].status !== 200 || data[0].items.length == 0 || !equalStrings(data[0].items[0].nickname, user1)) {
        console.log("Error response:", responses[0])
        console.log("If conditions: ")
        console.log("Status:", responses[0].status)
        console.log("Data items:", data[0].items)
        console.log("Items length:", data[0].items.length)
        console.log("Equal strings:", equalStrings(data[0].items[0].nickname, user1))
        error(res, "Cannot find user '" + user1 + "'")
        return [null, null, 400]
    }
    if (responses[1].status !== 200 || data[1].items.length == 0 || !equalStrings(data[1].items[0].nickname, user2)) {
        console.log("Error response:", responses[1])
        console.log("If conditions: ")
        console.log("Status:", responses[1].status)
        console.log("Data items:", data[1].items)
        console.log("Items length:", data[1].items.length)
        console.log("Equal strings:", equalStrings(data[1].items[0].nickname, user1))
        error(res, "Cannot find user '" + user2 + "'")
        return [null, null, 400]
    }

    // First name in list is a soft match (without capitalization), seek true match
    const user1_profile = findUserProfile(user1, data[0].items)
    const user2_profile = findUserProfile(user2, data[1].items)
    return [user1_profile, user2_profile, 200]
}

// Problem: Players with same username but different capitalization can exist
// Solution: Compare first 100 users in list, take best fit or first result (can miss a true match if >100 names)
function findUserProfile(user, data) {
    let user_profile
    for (let i = 0; i < data.length; i++) {
        if (data[i].nickname === user) {
            user_profile = data[i]
            break
        }
    }
    if (user_profile == undefined) user_profile = data[0]
    return user_profile
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