import gameScene from "./gameScene";

let scene = undefined;
async function game(BABYLON, engine, currentScene) {
  //   switch (currentState) {
  //     case "homeScene":
  //       await homeScene(BABYLON, engine, currentScene);
  //       break;
  //     case "gameScene":
  //       await gameScene(BABYLON, engine, currentScene);
  //       break;
  //   }

  scene = await gameScene(BABYLON, engine, currentScene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

export default game;
