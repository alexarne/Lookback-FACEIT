
fetch("/getMatchInfo")
    .then(r => r.json())
    .then(d => document.getElementById("info").innerHTML = JSON.stringify(d, null, 4))