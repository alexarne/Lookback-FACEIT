const URL = window.location.href.slice(0, -1)   // Remove last '/'


async function displayMutualGames() {
    const field1 = document.getElementById("input-user1-text")
    const field2 = document.getElementById("input-user2-text")
    const game = document.getElementById("input-game-dropdown")
    const button = document.getElementById("input-submit")
    const status = document.getElementById("input-status")

    button.disabled = true
    status.innerHTML = "Loading..."
    const [status_code, games] = await getMutualGames(
        field1.value, 
        field2.value, 
        1000, 
        game.value
    )
    // Maximum value for count is somewhere between 38,000 and 40,000. Beyond that is rate limited

    if (status_code === 200) {
        status.innerHTML = ""

    } else {
        status.innerHTML = games

    }
    console.log(games)
    button.disabled = false
}

async function getMutualGames(user1, user2, count, game) {
    const response = await fetch(URL + "/mutualGames", 
        requestParams("POST", {
            user1: user1,
            user2: user2,
            count: count,
            game: game
        })
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