import * as BABYLON from "@babylonjs/core";
import game from "./components/scene/game";

const canvas = document.querySelector("canvas");

let engine = new BABYLON.Engine(canvas, true);

let currentScene = new BABYLON.Scene(engine);

let camera = new BABYLON.FreeCamera(
  "camera1",
  new BABYLON.Vector3(0, 0, 0),
  currentScene
);

await game(BABYLON, engine, currentScene);
