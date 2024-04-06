import gameScene from "./gameScene";

let scene = undefined;
async function game(BABYLON, engine, currentScene) {
  scene = await gameScene(BABYLON, engine, currentScene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

export default game;
