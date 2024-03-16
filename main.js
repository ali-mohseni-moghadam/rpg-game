import * as BABYLON from "@babylonjs/core";
import "./style.css";

const canvas = document.querySelector("canvas");

let engine = new BABYLON.Engine(canvas, true);

let scene = new BABYLON.Scene(engine);

let camera = new BABYLON.FreeCamera(
  "camera1",
  new BABYLON.Vector3(0, 0, 0),
  scene
);

engine._renderLoop(() => {
  scene.render();
});
