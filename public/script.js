const URL = window.location.href.slice(0, -1)   // Remove last '/'

// Add "submit" on pressing ender
document.querySelectorAll("[data-submit-target]").forEach(field => {
    field.addEventListener("keypress", e => {
        if (e.key === "Enter") {
            e.preventDefault()
            document.querySelector(field.dataset.submitTarget).click()
        }
    })
})

const GAMES_PER_REQUEST = 200
let current_request
let game_counter = 0

async function displayMutualGames() {
    const field1 = document.getElementById("input-user1-text")
    const field2 = document.getElementById("input-user2-text")
    const game = document.getElementById("input-game-dropdown")
    const button = document.getElementById("input-submit")
    const status = document.getElementById("input-status")
    game_counter = 0

    button.disabled = true
    status.innerHTML = "Loading..."
    current_request = {
        user1: field1.value,
        user2: field2.value,
        count: GAMES_PER_REQUEST,
        game: game.value,
        offset: 0
    }
    const [status_code, response] = await getMutualGames(current_request)
    // Maximum value for count is somewhere between 38,000 and 40,000. Beyond that is rate limited

    if (status_code === 200) {
        status.innerHTML = ""
        document.getElementById("players").hidden = false
        setAvatar(document.getElementById("player1-img"), response.user1.avatar)
        setAvatar(document.getElementById("player2-img"), response.user2.avatar)
        const count = response.mutual_games.length
        document.getElementById("players-playedTogether-count").innerHTML = count
        document.getElementById("players-playedTogether-suffix").innerHTML = "game" + (count == 1 ? "" : "s")
        document.getElementById("games").hidden = false
        document.getElementById("games-moreButton").disabled = response.checked_all
        response.mutual_games.forEach(game => addGame(game))
    } else {
        status.innerHTML = response
        document.getElementById("players").hidden = true
    }
    console.log(response)
    button.disabled = false
    current_request.offset = response.checked_games
}

function setAvatar(element, img) {
    if (img !== "") {
        element.src = img
    } else {
        element.src = "data:image/jpeg;base64,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"
    }
}

function addGame(game) {
    const list = document.getElementById("games-list")
    console.log(game)
}

async function displayMoreGames() {
    const button = document.getElementById("games-moreButton")
    button.disabled = true

    const [status_code, response] = await getMutualGames(current_request)

    if (status_code === 200) {
        current_request.offset = response.checked_games
        let count = response.mutual_games.length + Number(document.getElementById("players-playedTogether-count").innerHTML)
        document.getElementById("players-playedTogether-count").innerHTML = count
        document.getElementById("players-playedTogether-suffix").innerHTML = "game" + (count == 1 ? "" : "s")
        if (response.checked_all) {
            button.disabled = true
        } else {
            button.disabled = false
        }
    } else {
        button.disabled = false

    }

    console.log(response)
}

async function getMutualGames(body) {
    const response = await fetch(URL + "/mutualGames", 
        requestParams("POST", body)
    )
    const data = await response.json()
    return [response.status, data]
}

function requestParams(type, body) {
    return {
        method: type,
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify(body),
    }
}