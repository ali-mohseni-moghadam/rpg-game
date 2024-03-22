import "@babylonjs/loaders";

const logError = console.error;

function createGround(scene, BABYLON) {
  const { MeshBuilder, StandardMaterial, Texture, Color3 } = BABYLON;

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 50, height: 50 },
    scene
  );

  const groundMat = new StandardMaterial("groundMat", scene);

  const diffuseTex = new Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/coast_sand_rocks_02/coast_sand_rocks_02_diff_4k.jpg",
    scene
  );
  const normalTex = new Texture(
    "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/coast_sand_rocks_02/coast_sand_rocks_02_nor_gl_4k.jpg",
    scene
  );

  groundMat.diffuseTexture = diffuseTex;
  groundMat.bumpTexture = normalTex;

  diffuseTex.uScale = 10;
  diffuseTex.vScale = 10;
  normalTex.uScale = 10;
  normalTex.vScale = 10;

  groundMat.specularColor = new Color3(0, 0, 0);

  ground.material = groundMat;
}

async function gameScene(BABYLON, engine, currentScene) {
  const {
    Vector3,
    MeshBuilder,
    StandardMaterial,
    FreeCamera,
    HemisphericLight,
    Scene,
    SceneLoader,
    ExecuteCodeAction,
    ActionManager,
  } = BABYLON;

  let isMoving = false;
  let characterSpeed = 4;

  const scene = new Scene(engine);

  const cam = new FreeCamera("camera", new Vector3(0, 0, -6), scene);

  const light = new HemisphericLight("light", new Vector3(0, 10, 0), scene);

  // import Tree
  const treeMain = await SceneLoader.ImportMeshAsync(
    "",
    "../",
    "Tree.glb",
    scene
  );

  // Character Creation
  const Model = await SceneLoader.ImportMeshAsync(
    "",
    "../",
    "character.glb",
    scene
  );
  const animation = Model.animationGroups;
  const meshes = Model.meshes;
  const rootMesh = meshes[0];
  const characterBox = MeshBuilder.CreateBox("characterBox", {
    size: 1,
    height: 2,
    scene,
  });
  rootMesh.parent = characterBox;
  characterBox.visibility = 0;
  rootMesh.position.y = -1;
  characterBox.position.y += 1;

  animation.forEach((anim) => {
    if (anim.name === "idle") anim.play(true);
  });

  // TargetBox Creation
  const targetBox = MeshBuilder.CreateBox("targetBox", {
    size: 0.2,
    scene,
  });
  targetBox.isPickable = false;
  targetBox.isVisible = false;
  targetBox.actionManager = new ActionManager(scene);
  targetBox.actionManager.registerAction(
    new ExecuteCodeAction(
      {
        trigger: ActionManager.OnIntersectionEnterTrigger,
        parameter: characterBox,
      },
      (e) => {
        Stop();
      }
    )
  );

  createGround(scene, BABYLON);

  const cameraContainer = MeshBuilder.CreateGround(
    "ground",
    { width: 0.5, height: 0.5 },
    scene
  );
  cameraContainer.position = new Vector3(0, 15, 0);
  cam.parent = cameraContainer;
  cam.setTarget(new Vector3(0, -10, 0));

  let camVertical = 0;
  let camHorizontal = 0;
  let camSpeed = 3;

  window.addEventListener("keydown", (e) => {
    const theKey = e.key.toLowerCase();

    if (theKey === "arrowup") camVertical = 1;
    if (theKey === "arrowdown") camVertical = -1;
    if (theKey === "arrowleft") camHorizontal = -1;
    if (theKey === "arrowright") camHorizontal = 1;
  });

  window.addEventListener("keyup", (e) => {
    const theKey = e.key.toLowerCase();

    if (theKey === "arrowup") camVertical = 0;
    if (theKey === "arrowdown") camVertical = 0;
    if (theKey === "arrowleft") camHorizontal = 0;
    if (theKey === "arrowright") camHorizontal = 0;
  });

  scene.onPointerDown = (e) => {
    if (e.buttons === 1) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
      if (pickInfo.pickedMesh.name === "ground") {
        targetBox.position = pickInfo.pickedPoint;
        Move(pickInfo.pickedPoint);
      }
    }
  };

  function Move(directionPos) {
    isMoving = true;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);
    animation.forEach((anim) => anim.name === "running" && anim.play(true));
  }

  function Stop() {
    targetBox.position.y = 100;
    isMoving = false;
    animation.forEach((anim) => anim.name === "running" && anim.stop());
  }

  scene.registerAfterRender(() => {
    const deltaTime = engine.getDeltaTime() / 1000;
    cameraContainer.locallyTranslate(
      new Vector3(
        camHorizontal * camSpeed * deltaTime,
        0,
        camVertical * camSpeed * deltaTime
      )
    );
    if (isMoving)
      characterBox.locallyTranslate(
        new Vector3(0, 0, characterSpeed * deltaTime)
      );
  });

  await scene.whenReadyAsync();
  currentScene.dispose();
  return scene;
}

export default gameScene;
