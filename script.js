const gameFrame = document.querySelector("#gameFrame");
const playTitle = document.querySelector("#playTitle");
const gameCards = document.querySelectorAll("[data-game-src]");

gameCards.forEach((card) => {
    card.addEventListener("click", () => {
        const src = card.dataset.gameSrc;

        if (!src) {
            return;
        }

        gameCards.forEach((item) => item.classList.remove("active"));
        card.classList.add("active");
        gameFrame.src = src;
        playTitle.textContent = card.dataset.gameTitle || "게임";
        document.querySelector("#play").scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
