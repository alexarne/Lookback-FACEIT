console.log("booted")
const URL = window.location.href.slice(0, -1)   // Remove last '/'

fetch(URL + "/mutualGames", 
    requestParams("POST", {
        user1: "grand3k",
        user2: "racuchWEST",
        count: 1000,
        game: "lol_EUW"
    })
)
.then(response => response.json())
.then(data => console.log(data))

function requestParams(type, body) {
    return {
        method: type,
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify(body),
    }
}