let currentWord = ""
let dayOn = 0

let inputEnabled = false

let won = null

let guessOn = 0
let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

let fullWordList = []

let keyLevels = {}
let hasLoadedKeyboard = false

let guesses = []
let shareMap = []
let emoji = {
	green: "🟢",
	yellow: "🟡",
	grey: "⚫",
	blue: "🔵",
}

let popup = document.querySelector(".stats-screen")
let keyboardEl = document.querySelector(".keyboard")

async function fetchWordLists() {
	let wordLists = [
		// await fetch(
		// 	"https://raw.githubusercontent.com/MagicOctopusUrn/wordListsByLength/master/4.txt"
		// ).then(res => res.text()),
		await fetch(
			"https://raw.githubusercontent.com/MagicOctopusUrn/wordListsByLength/master/5.txt"
		).then(res => res.text()),
		await fetch(
			"https://raw.githubusercontent.com/MagicOctopusUrn/wordListsByLength/master/6.txt"
		).then(res => res.text()),
		await fetch(
			"https://raw.githubusercontent.com/MagicOctopusUrn/wordListsByLength/master/7.txt"
		).then(res => res.text()),
	]

	wordLists.forEach(wordList => {
		wordList = wordList.toUpperCase()
		wordList = wordList
			.split("")
			.filter(c => alphabet.includes(c) || c == "\n")
			.join("")
		fullWordList = fullWordList.concat(wordList.split("\n"))
	})
}

async function getTodaysWord() {
	let dailyWordsList = await fetch("/dictionary/daily.txt").then(r => r.text())

	dailyWordsList = dailyWordsList
		.split("")
		.filter(c => alphabet.includes(c) || c == "\n")
		.join("")

	fullWordList = dailyWordsList.split("\n")

	// get number of days since 2024-03-30
	let today = new Date()
	let todayDate = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`)
	dayOn = Math.floor(
		(todayDate.getTime() - new Date("2024-03-31").getTime()) / (1000 * 60 * 60 * 24)
	)

	// dayOn = Math.floor(Math.random() * (fullWordList.length - 1)) // TEMMP

	// get word from list
	currentWord = dailyWordsList.split("\n")[dayOn % fullWordList.length]
}

let typedSoFar = ""

window.addEventListener("keydown", e => handleInput(e.key))

function handleInput(key) {
    if (!inputEnabled) return

	if (key === "Backspace" || key === "Delete" || key === "<") {
		if (typedSoFar.length > 0) {
			document.querySelector(`#tile-${guessOn}-${typedSoFar.length - 1}`).innerHTML = ""
			typedSoFar = typedSoFar.slice(0, -1)
		}
	} else if (key === "Enter" || key === "+") {
		if (typedSoFar.length === currentWord.length) submitGuess()
	} else if (typedSoFar.length < currentWord.length && alphabet.includes(key.toUpperCase())) {
		document.querySelector(`#tile-${guessOn}-${typedSoFar.length}`).innerHTML = `<p>${key}</p>`
		typedSoFar += key.toUpperCase()
	}
}

let boardEl = document.querySelector(".board")
function createAllRows() {
	let guessesAllowed = currentWord.length + 1
	for (let i = 0; i < guessesAllowed; i++) {
		let rowEl = document.createElement("div")
		rowEl.classList.add("row")
		rowEl.id = `row-${i}`

		for (let j = 0; j < currentWord.length; j++) {
			let tileEl = document.createElement("div")
			tileEl.classList.add("tile")
			tileEl.id = `tile-${i}-${j}`
			tileEl.innerHTML = ""
			rowEl.appendChild(tileEl)
		}

		boardEl.appendChild(rowEl)
	}
}

function submitGuess(waitForAnimation = true) {
	let word = currentWord
	let guess = typedSoFar.split("")

	if (!fullWordList.includes(guess.join("").toUpperCase())) {
		// play shaking animation
		let rowEl = document.querySelector(`#row-${guessOn}`)
		rowEl.classList.add("shake")
		setTimeout(() => {
			rowEl.classList.remove("shake")
		}, 500)

		return
	}

	guesses.push(typedSoFar)
	shareMap[guessOn] = []
	saveGameState()

	// count frequency of letters in word
	let lettersInWord = {}
	for (let i = 0; i < 26; i++) {
		lettersInWord[String.fromCharCode(i + 65)] = word
			.split("")
			.filter(c => c.charCodeAt(0) === i + 65).length
	}

	// check all green letters first
	guess.forEach((letter, position) => {
		let guessTile = document.querySelector(`#tile-${guessOn}-${position}`)
		if (word.charAt(position) == letter) {
			lettersInWord[letter]--
			guessTile.classList.add("green")
            keyLevels[letter] = Math.max(3, keyLevels[letter] || 0)
			shareMap[guessOn][position] = emoji.green
		}
	})

	// now check for yellow ones
	guess.forEach((letter, position) => {
		let guessTile = document.querySelector(`#tile-${guessOn}-${position}`)
		if (guessTile.classList.contains("green")) return

		if (lettersInWord[letter] > 0) {
			lettersInWord[letter]--
			guessTile.classList.add("yellow")
            keyLevels[letter] = Math.max(2, keyLevels[letter] || 0)
			shareMap[guessOn][position] = emoji.yellow
		} else {
			guessTile.classList.add("grey")
            keyLevels[letter] = Math.max(1, keyLevels[letter] || 0)
			shareMap[guessOn][position] = emoji.grey
		}
	})

	let animationTime = 500
	// animate tiles flipping over one by one
	guess.forEach((letter, position) => {
		let guessTile = document.querySelector(`#tile-${guessOn}-${position}`)

		setTimeout(() => {
			guessTile.classList.add("flipping")
			setTimeout(() => {
				guessTile.classList.add("flipped")
			}, animationTime / 2)
		}, (position * animationTime) / 2)
	})

	if (waitForAnimation) {
		// wait for all tiles to flip
		inputEnabled = false
		setTimeout(() => {
            updateKeyboardColors()
			if (typedSoFar === word) {
				triggerWinScreen()
			} else if (guessOn >= currentWord.length) {
				triggerLoseScreen()
			} else {
				inputEnabled = true
				typedSoFar = ""
				guessOn++
			}
		}, (guess.length * animationTime) / 1.5)
	} else {
        updateKeyboardColors()
		if (typedSoFar === word) {
			setTimeout(() => triggerWinScreen(false), (guess.length * animationTime) / 1.5)
		} else if (guessOn >= currentWord.length) {
			setTimeout(() => triggerLoseScreen(false), (guess.length * animationTime) / 1.5)
		} else {
			guessOn++
			typedSoFar = ""
		}
		inputEnabled = guessOn < currentWord.length + 1
	}
}

function triggerWinScreen(incrementStats = true) {
	if (incrementStats) {
		let gamesPlayed = localStorage.getItem("iccdle-played") || 0
		localStorage.setItem("iccdle-played", parseInt(gamesPlayed) + 1)

		let streak = localStorage.getItem("iccdle-streak") || 0
		localStorage.setItem("iccdle-streak", parseInt(streak) + 1)
		localStorage.setItem("iccdle-last-win", new Date().toISOString())

		let wins = localStorage.getItem("iccdle-wins") || 0
		localStorage.setItem("iccdle-wins", parseInt(wins) + 1)
	}

	won = true

	loadStats(false)

	popup.querySelector(".popup-title").innerHTML = `You won!`
	popup.querySelector(".win-msg").innerHTML = `You guessed today's word in ${guessOn + 1} guess${
		guessOn != 0 ? "es" : ""
	}!`
	popup.querySelector(".share-button").style.display = "inline-block"
	openPopup()
}

function triggerLoseScreen(incrementStats = true) {
	if (incrementStats) {
		let gamesPlayed = localStorage.getItem("iccdle-played") || 0
		localStorage.setItem("iccdle-played", parseInt(gamesPlayed) + 1)

		localStorage.setItem("iccdle-streak", 0)
	}

	won = false

	loadStats(false)

	popup.querySelector(".popup-title").innerHTML = `You lost!`
	popup.querySelector(".share-button").style.display = "inline-block"
	openPopup()
}

function saveGameState() {
	localStorage.setItem("iccdle-state-saved", new Date().toISOString())
	localStorage.setItem("iccdle-guesses", JSON.stringify(guesses))
}

function loadGameState() {
	let savedState = localStorage.getItem("iccdle-state-saved")
	let savedStateDate = new Date(savedState)
	let today = new Date()
	let todayDate = new Date(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`)
	if (
		savedStateDate.getDate() == todayDate.getDate() &&
		savedStateDate.getMonth() == todayDate.getMonth()
	) {
		let guesses = localStorage.getItem("iccdle-guesses")
		if (guesses) {
			guesses = JSON.parse(guesses)
			guesses.forEach((g, i) => {
				typedSoFar = g
				g.split("").forEach((l, i) => {
					document.querySelector(`#tile-${guessOn}-${i}`).innerHTML = `<p>${l}</p>`
				})
				submitGuess(false)
			})
		}
	}
}

function newGame() {
	guessOn = 0
	typedSoFar = ""
	boardEl.innerHTML = ""
	createAllRows()
}

function loadStats(checkStreak = true) {
	let statsContainer = document.querySelector(".stats-screen")

	let streak = 0
	if (checkStreak) {
		let savedStreak = localStorage.getItem("iccdle-streak")
		let lastWin = localStorage.getItem("iccdle-last-win")
		// if last win was not yesterday, reset streak
		let today = new Date()
		let yesterday = new Date(today.getTime() - 1000 * 60 * 60 * 24)
		let lastStreakDay = new Date(lastWin)
		if (lastStreakDay.getDate() == yesterday.getDate() || lastStreakDay.getDate() == today.getDate()) {
			streak = savedStreak || 0
		} else {
			localStorage.setItem("iccdle-streak", 0)
		}
	} else {
		streak = localStorage.getItem("iccdle-streak") || 0
	}

	let stats = {
		played: localStorage.getItem("iccdle-played") || 0,
		wins: localStorage.getItem("iccdle-wins") || 0,
		streak: streak,
	}

	for (let i in stats) statsContainer.querySelector(`.stat-${i}`).textContent = stats[i]
}

function share() {
	let newMap = [
		`${emoji.blue} ICCdle #${dayOn + 1}, ${won ? guessOn + 1 : "X"}/${currentWord.length + 1}`,
		"",
	]
	shareMap.forEach(r => newMap.push(r.join("")))

	let shareText = newMap.join("\n")
	copyText(shareText)
	console.log(shareText)

    let shareButton = document.querySelector(".share-button")
    shareButton.innerHTML = `<i class="ti ti-share"></i> Copied!`
    setTimeout(() => shareButton.innerHTML = `<i class="ti ti-share"></i> Share`, 1000)
}

function createKeyboard() {
	let letters = ["QWERTYUIOP", "ASDFGHJKL", "+ZXCVBNM<"]

	for (let row = 0; row < letters.length; row++) {
		let rowEl = document.createElement("div")
		rowEl.classList.add("row")

		for (let letter = 0; letter < letters[row].length; letter++) {
			let letterEl = document.createElement("button")
			letterEl.classList.add("key")
			letterEl.classList.add(`row${row}`)
			letterEl.id = `key-${letters[row][letter].toLowerCase()}`
			if (letters[row][letter] == "+") {
				letterEl.textContent = "ENTER"
				letterEl.classList.add("symbol")
				letterEl.classList.add("enter")
			} else if (letters[row][letter] == "<") {
				letterEl.textContent = "<"
				letterEl.classList.add("symbol")
			} else letterEl.textContent = letters[row][letter].toUpperCase()

			letterEl.addEventListener("click", () => handleInput(letters[row][letter]))
			rowEl.append(letterEl)
		}

		keyboardEl.append(rowEl)
	}
    hasLoadedKeyboard = true
}

function updateKeyboardColors() {
    console.log("ello")
    if (!hasLoadedKeyboard) return
    for(let i in keyLevels) {
        if (i == "+" || i == "<") continue
        console.log(i)
        let key = document.querySelector(`#key-${i.toLowerCase()}`)
        console.log(key, keyLevels[i])
        if (!key) continue
        key.classList.toggle("green", keyLevels[i] == 3)
        key.classList.toggle("yellow", keyLevels[i] == 2)
        key.classList.toggle("grey", keyLevels[i] == 1)
    }
}

function openPopup(pop = "stats") {
	popup.querySelectorAll(".main").forEach(m => m.classList.remove("visible"))
	popup.querySelector(`.pop-${pop}`).classList.add("visible")
	setTimeout(() => popup.classList.add("active"), 1)
}
function closePopup() {
	popup.classList.remove("active")
}
popup.querySelector(".bg").addEventListener("click", closePopup)

// this has to happen on load because otherwise the animations play immediately
window.addEventListener("load", async () => {
	await getTodaysWord()
	await fetchWordLists()
	loadStats()
	inputEnabled = true
	newGame()
	loadGameState()
    createKeyboard()
    updateKeyboardColors()

	popup.style.display = "flex"
})

function copyText(txt) {
	let copyText = document.createElement("textarea")
	copyText.value = txt
	document.body.appendChild(copyText)

	copyText.select()
	copyText.setSelectionRange(0, 99999)

	document.execCommand("copy")

	copyText.remove()
}
