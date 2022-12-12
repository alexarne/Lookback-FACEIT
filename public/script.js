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

const GAMES_PER_REQUEST = 1000
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

    } else {
        status.innerHTML = response

    }
    console.log(response)
    button.disabled = false
    current_request.offset = response.last_game
}

async function displayMoreGames() {
    const button = document.getElementById("games-moreButton")
    button.disabled = true

    const [status_code, response] = await getMutualGames(current_request)

    console.log(response)
    button.disabled = false
    current_request.offset = response.last_game
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