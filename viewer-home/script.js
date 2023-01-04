

function lookupMatch() {
    let id = document.getElementById("match-input").value
    if (id.startsWith("https://www.faceit.com/")) id = id.replace(/https\:\/\/www\.faceit\.com\/.+\/csgo\/room\//, "")
    window.location = "/viewer/" + id
}

