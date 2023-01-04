
fetch("/getMatchInfo", requestParams("POST", {
    matchId: document.getElementById("matchId").innerHTML
}))
    .then(r => {
        if (r.status !== 200) {
            document.getElementById("info").innerHTML = "Couldn't fetch"
            throw "Fetch Error"
        }
        return r.json()
    })
    .then(d => {
        document.getElementById("info").innerHTML = JSON.stringify(d, null, 4)
    })
    .catch(e => console.log(e))


fetch("/getMatchStats", requestParams("POST", {
    matchId: document.getElementById("matchId").innerHTML
}))
    .then(r => {
        if (r.status !== 200) {
            document.getElementById("stats").innerHTML = "Couldn't fetch"
            throw "Fetch Error"
        }
        return r.json()
    })
    .then(d => {
        document.getElementById("stats").innerHTML = JSON.stringify(d, null, 4)
    })
    .catch(e => console.log(e))



function requestParams(type, body) {
    return {
        method: type,
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify(body),
    }
}