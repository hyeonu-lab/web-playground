const gameFrame = document.querySelector("#gameFrame");
const playTitle = document.querySelector("#playTitle");
const launchButtons = document.querySelectorAll("[data-game-src]");

launchButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const src = button.dataset.gameSrc;

        if (!src) {
            return;
        }

        gameFrame.src = src;
        playTitle.textContent = button.dataset.gameTitle || "기능";
        document.querySelector("#play").scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
