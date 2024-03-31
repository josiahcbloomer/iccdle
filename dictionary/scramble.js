const fs = require("fs")

console.log("Loading file...")

let file = fs.readFileSync("./dictionary/daily.txt", "utf8")
let list = file.split("\n")

console.log("Randomizing words...")
let scrambledList = randomizeArray(list)
console.log(scrambledList.length + " words scrambled! Writing to file...")
fs.writeFileSync("./dictionary/daily.txt", scrambledList.join("\n"))
console.log("Done!")

function randomizeArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}