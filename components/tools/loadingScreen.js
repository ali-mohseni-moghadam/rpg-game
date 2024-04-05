export default function loadingScreen() {
  const loadScreenContainer = document.querySelector(".loading-screen");
  const label = document.querySelector(".label");

  function openLoadingScreen(textToDisplay) {
    loadScreenContainer.style.display = "flex";
    label.innerHTML = textToDisplay ? textToDisplay : "Loading...";
  }
  function closeLoadingScreen() {
    loadScreenContainer.style.display = "none";
  }

  return { openLoadingScreen, closeLoadingScreen };
}
