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

// Sanitize user input on blur
document.querySelectorAll(".user-input").forEach(elem => {
    elem.addEventListener("blur", (e) => {
        elem.value = elem.value.trim()
    })
    elem.addEventListener("focus", (e) => {
        
    })
})

const logo = {
    csgo: "https://assets.faceit-cdn.net/third_party/games/4f899245-2fa8-4e52-ad9a-4a363613c19e/assets/details/csgo_flag_l_1589795099305.jpg",
    lol_EUW: "https://assets.faceit-cdn.net/third_party/games/2386f8e0-8aed-461f-bfb4-8634b23bfb14/assets/details/lol_EUW_flag_l_1600340149252.jpg",
    lol_EUN: "https://assets.faceit-cdn.net/third_party/games/91e012e7-a1fe-4385-893c-3747da1fb341/assets/details/lol_EUN_flag_l_1600339899476.jpg",
}

const GAMES_PER_REQUEST = 200
let current_request
let game_counter = 0

// Called when searching new players
async function displayMutualGames() {
    document.getElementById("player1").classList.remove("show")
    document.getElementById("player2").classList.remove("show")
    document.getElementById("games-header").classList.remove("show")
    document.getElementById("players-div").hidden = false
    document.getElementById("games").hidden = false

    // Remove all games from the list except for the template
    const list = document.getElementById("games-list")
    document.querySelectorAll(".game").forEach((node) => {
        list.removeChild(node)
    })

    const field1 = document.getElementById("input-user1-text")
    const field2 = document.getElementById("input-user2-text")
    if (field1.value === "") field1.value = field1.placeholder
    if (field2.value === "") field2.value = field2.placeholder

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
        setAvatar(document.getElementById("player1-img"), response.user1.avatar)
        setAvatar(document.getElementById("player2-img"), response.user2.avatar)
        
        document.getElementById("player1-url").href = "https://www.faceit.com/en/players/" + response.user1.nickname
        document.getElementById("player2-url").href = "https://www.faceit.com/en/players/" + response.user2.nickname
        document.getElementById("player1-name").innerHTML = response.user1.nickname
        document.getElementById("player2-name").innerHTML = response.user2.nickname

        document.getElementById("player1").classList.add("show")
        document.getElementById("player2").classList.add("show")
        document.getElementById("games-header").classList.add("show")

        const count = response.mutual_games.length
        document.getElementById("players-playedTogether-count").innerHTML = " " + count + " "
        document.getElementById("players-playedTogether-suffix").innerHTML = "game" + (count == 1 ? "" : "s")
        document.getElementById("games").hidden = false
        document.getElementById("games-moreButton").disabled = response.checked_all
        addGames(response.mutual_games)
    } else {
        status.innerHTML = response
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

function addGames(games) {
    if (games.length <= 0) return
    
    const game = games.shift()
    const template = document.querySelector(".template")
    let clone = template.cloneNode(true)
    clone.removeAttribute("id")
    clone.classList.remove("hidden")
    clone.classList.add("game")

    // <div class="template hidden">
    //     <div class="game-logo">
    //         <img src="https://assets.faceit-cdn.net/third_party/games/2386f8e0-8aed-461f-bfb4-8634b23bfb14/assets/details/lol_EUW_flag_l_1600340149252.jpg" alt="">
    //     </div>
    //     <div class="game-date">b</div>
    //     <div class="game-team1">c</div>
    //     <div class="game-team2">d</div>
    //     <div class="game-score">
    //         <span>1</span>-<span>2</span>
    //     </div>
    //     <div class="game-legacy">
    //         <a href="">INFO</a>
    //     </div>
    //     <div class="game-link">
    //         <a href="">LINK</a>
    //     </div>
    // </div>
    console.log(game)
    clone.querySelector(".game-logo img").src = logo[game.game_id]
    clone.querySelector(".game-date").innerHTML = game.started_at
    clone.querySelector(".game-team1").innerHTML = game.teams.faction1.nickname
    clone.querySelector(".game-team2").innerHTML = game.teams.faction2.nickname
    clone.querySelector(".game-link a").href = game.faceit_url.replace("{lang}", "en")

    template.parentNode.appendChild(clone)
    setTimeout(() => {
        clone.classList.add("show")
        addGames(games)
    }, 10);
}

// Called when fetching more games from previously searched players
async function displayMoreGames() {
    const button = document.getElementById("games-moreButton")
    button.disabled = true

    const [status_code, response] = await getMutualGames(current_request)

    if (status_code === 200) {
        current_request.offset = response.checked_games
        let count = response.mutual_games.length + Number(document.getElementById("players-playedTogether-count").innerHTML)
        document.getElementById("players-playedTogether-count").innerHTML = " " + count + " "
        document.getElementById("players-playedTogether-suffix").innerHTML = "game" + (count == 1 ? "" : "s")
        addGames(response.mutual_games)
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
    let caught = false
    const response = await fetch(URL + "/mutualGames", 
        requestParams("POST", body)
    ).catch(e => {
        console.log("Failed fetch, error:", e)
        caught = true
        return [400, "Error: Failed fetch"]
    })
    
    if (caught) return response
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