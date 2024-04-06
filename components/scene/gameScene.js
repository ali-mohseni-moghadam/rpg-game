import "@babylonjs/loaders";
import * as GUI from "@babylonjs/gui";
import loadingScreen from "../tools/loadingScreen";

const { openLoadingScreen, closeLoadingScreen } = loadingScreen();

function createGround(scene, BABYLON) {
  const { MeshBuilder, StandardMaterial, Texture, Color3 } = BABYLON;

  const ground = MeshBuilder.CreateGround(
    "ground",
    { width: 50, height: 50 },
    scene
  );

  const groundMat = new StandardMaterial("groundMat", scene);

  const diffuseTex = new Texture("../rocky_trail_02_diff_4k.jpg", scene);
  const normalTex = new Texture("../rocky_trail_02_nor_gl_4k.jpg", scene);

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
  openLoadingScreen("Loading Game ...");

  const {
    Vector3,
    MeshBuilder,
    FreeCamera,
    HemisphericLight,
    Scene,
    SceneLoader,
    ExecuteCodeAction,
    ActionManager,
    Scalar,
    Mesh,
  } = BABYLON;

  let GAMEOVER = false;
  let isMoving = false;
  let isAttacking = false;
  let targetName = undefined;
  let targetId = undefined;
  let attackInterval;
  let damageTimeout;
  // hero details
  let heroDamage = 50;
  let heroLife = { currentHp: 100, maxHp: 100 };
  let ourTargetPosition;
  let characterSpeed = 4;

  const scene = new Scene(engine);

  const cam = new FreeCamera("camera", new Vector3(0, 0, -6), scene);

  const light = new HemisphericLight("light", new Vector3(0, 10, 0), scene);

  // sound
  const slashSound = new BABYLON.Sound(
    "slashSound",
    "../slash.mp3",
    scene,
    null,
    {
      loop: false,
      autoplay: false,
    }
  );

  // import Tree
  const treeMain = await SceneLoader.ImportMeshAsync(
    "",
    "../",
    "Tree.glb",
    scene
  );

  const tree = treeMain.meshes[1];
  tree.parent = null;
  treeMain.meshes[0].dispose();

  let treeLength = 25;
  let radius = 25;

  for (let i = 0; i <= treeLength; i++) {
    const randomX = Scalar.RandomRange(-radius, radius);
    const randomY = Scalar.RandomRange(-radius, radius);

    const treeClone = tree.clone("tree");
    treeClone.position = new Vector3(randomX, 0, randomY, scene);
    createLifeBar(treeClone, 100, 100, scene, 4.6);
    createTextMesh("Evil Tree", "red", scene, treeClone, 4.9);
    treeClone.scaling = new Vector3(0.7, 0.8, 0.7);
    treeClone.hp = 100;
  }

  tree.dispose();

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

  createTextMesh("Ali", "White", scene, characterBox, 2);

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

  const { lifeTotal, redRectangle } = createLifeUi(
    heroLife.currentHp,
    heroLife.maxHp
  );

  createGround(scene, BABYLON);

  // enemy creation
  let spawnInterval;
  let enemies = [];
  let enemyRootMesh = await SceneLoader.LoadAssetContainerAsync(
    "../",
    "enemy.glb",
    scene
  );
  spawnInterval = setInterval(() => {
    if (GAMEOVER) return clearInterval(spawnInterval);
    const enemId = `enemy${Math.random()}`;
    // const randomZ = Scalar.RandomRange(-2, 2);

    const enemyDetails = {
      _id: enemId,
      name: "knight",
      hp: 100,
      maxHp: 100,
      dmg: 10,
      isMoving: false,
      spd: 2,
      pos: { x: 0, z: 6 },
    };

    createEnemy(enemyDetails, scene);
  }, 3000);

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
  let camSpeed = 10;

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
    if (GAMEOVER) return;
    if (e.buttons === 1) {
      const pickInfo = scene.pick(scene.pointerX, scene.pointerY);

      if (!pickInfo.hit) return;

      targetName = pickInfo.pickedMesh.name;
      targetId = pickInfo.pickedMesh.id;

      pickInfo.pickedPoint.y = characterBox.position.y;
      ourTargetPosition = pickInfo.pickedPoint;
      const distance = caculateDistance(
        ourTargetPosition,
        characterBox.position
      );

      if (targetName === "ground") {
        if (distance < 1) return console.log("we are near on our target");
        Move(ourTargetPosition);
      }

      if (targetName === "tree") {
        if (distance < 1) return initializeAttack(ourTargetPosition);
        Move(ourTargetPosition);
      }

      if (targetName.includes("enemy")) {
        if (distance < 1) return initializeAttack(ourTargetPosition);
        Move(ourTargetPosition);
      }
    }
  };

  function caculateDistance(targetPosition, ourPosition) {
    return Vector3.Distance(targetPosition, ourPosition);
  }

  function Move(directionPos) {
    isMoving = true;
    isAttacking = false;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);
    animation.forEach((anim) => anim.name === "idle" && anim.stop());
    animation.forEach((anim) => anim.name === "attack" && anim.stop());
    animation.forEach((anim) => anim.name === "running" && anim.play(true));
  }

  function Stop() {
    clearInterval(attackInterval);
    isMoving = false;
    animation.forEach((anim) => anim.name === "running" && anim.stop());
    animation.forEach((anim) => anim.name === "idle" && anim.play(true));
    ourTargetPosition = undefined;
  }

  function initializeAttack(ourTargetPosition) {
    clearInterval(attackInterval);
    animation.forEach((anim) => anim.name === "running" && anim.stop());
    attack(ourTargetPosition);
    attackInterval = setInterval(() => {
      if (GAMEOVER) return clearInterval(attackInterval);
      attack(ourTargetPosition);
    }, 2000);
  }

  function attack(directionPos) {
    const enemyDetail = enemies.find((enemy) => enemy._id === targetId);

    if (!enemyDetail) {
      console.log("Enemy not found.");
      return;
    }

    if (!targetName.includes("enemy") && !enemyDetail)
      return console.log("enemy not found");

    let targetDetail;
    if (targetName.includes("enemy")) targetDetail = enemyDetail;

    isMoving = false;
    isAttacking = true;
    const { x, z } = directionPos;
    characterBox.lookAt(new Vector3(x, characterBox.position.y, z), 0, 0, 0);
    animation.forEach((anim) => anim.name === "idle" && anim.stop());
    animation.forEach((anim) => anim.name === "running" && anim.stop());
    animation.forEach((anim) => anim.name === "attack" && anim.play());

    damageTimeout = setTimeout(() => {
      if (!targetDetail) return;
      const hpAfterDamage = targetDetail.hp - heroDamage;
      targetDetail.hp = hpAfterDamage;
      slashSound.play();
      if (hpAfterDamage <= 0) {
        if (targetName.includes("enemy"))
          enemies = enemies.filter((enemy) => enemy._id !== targetId);

        targetId = undefined;
        ourTargetPosition = undefined;

        Stop();
        return targetDetail.mesh.dispose();
      }
      targetDetail.lifeBarUi.width = `${
        (targetDetail.hp / targetDetail.maxHp) * 100 * 4
      }px`;
      animation.forEach((anim) => anim.name === "attack" && anim.stop());
    }, 2000);
  }

  function createLifeBar(parent, hp, maxHp, scene, posY) {
    const lifeBar = Mesh.CreatePlane("lifeBar", 4, scene);
    lifeBar.billboardMode = Mesh.BILBOARDMODE_ALL;
    lifeBar.parent = parent;

    const lifeBarTexture = GUI.AdvancedDynamicTexture.CreateForMesh(lifeBar);
    lifeBar.position = new Vector3(0, posY ? posY : 4, 0);
    lifeBar.isPickable = false;

    const currentLife = (hp / maxHp) * 100 * 4;

    const lifeBarUi = new GUI.Rectangle();
    lifeBarUi.width = `${currentLife}px`;
    lifeBarUi.height = "35px";
    lifeBarUi.cornerRadius = 20;
    lifeBarUi.color = "Orange";
    lifeBarUi.thickness = 4;
    lifeBarUi.background = "green";
    lifeBarTexture.addControl(lifeBarUi);

    return lifeBarUi;
  }

  function createLifeUi(currentLife, maxLife) {
    const advanceTexture =
      GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI_ManaStamina");

    const redRectangle = new GUI.Rectangle();
    redRectangle.width = `${(currentLife / maxLife) * 100 * 2}px`;
    redRectangle.height = "22px";
    redRectangle.cornerRadius = 5;
    redRectangle.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    redRectangle.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    redRectangle.top = "15px";
    redRectangle.left = "15px";
    redRectangle.background = "red";
    redRectangle.thickness = 0;

    advanceTexture.addControl(redRectangle);

    // border container for our life ui
    const borderForLife = new GUI.Rectangle();
    borderForLife.width = `${(currentLife / maxLife) * 100 * 2 + 14}px`;
    borderForLife.height = "34px";
    borderForLife.cornerRadius = 5;
    borderForLife.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    borderForLife.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    borderForLife.top = "9px";
    borderForLife.left = "8px";
    borderForLife.background = "transparent";
    borderForLife.thickness = 1;
    borderForLife.color = "gray";

    advanceTexture.addControl(borderForLife);

    const lifeTotal = new GUI.TextBlock();
    lifeTotal.width = `${(currentLife / maxLife) * 100 * 2}px`;
    lifeTotal.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    lifeTotal.height = "25px";
    lifeTotal.color = "white";
    lifeTotal.text = `${currentLife}/${maxLife}`;
    lifeTotal.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    lifeTotal.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    lifeTotal.top = "15";
    lifeTotal.left = "15";

    advanceTexture.addControl(lifeTotal);

    return { lifeTotal, redRectangle };
  }

  function createTextMesh(textToDisplay, color, scene, theParent, posY) {
    const nameId = `text${Math.random()}`;
    const nameMesh = Mesh.CreatePlane(nameId, 4, scene);
    nameMesh.billboardMode = Mesh.BILBOARDMODE_ALL;
    const textureForName = GUI.AdvancedDynamicTexture.CreateForMesh(nameMesh);
    nameMesh.isPickable = false;
    nameMesh.isVisible = true;

    const nameText = new GUI.TextBlock();
    nameText.text = textToDisplay;
    nameText.color = color;
    nameText.fontSize = 100;
    nameText.height = 50;
    nameText.width = 150;
    nameText.background = "red";
    textureForName.addControl(nameText);

    nameMesh.parent = theParent;
    nameMesh.position = new Vector3(0, posY ? posY : 2, 0);

    return nameMesh;
  }

  function createEnemy(pawnDetail, scene) {
    // if (scene.getMeshByName(pawnDetail._id)) return;
    const { x, z } = pawnDetail.pos;
    const body = MeshBuilder.CreateBox(
      pawnDetail._id,
      { size: 1, height: 2 },
      scene
    );
    body.id = pawnDetail._id;
    body.position = new Vector3(x, 1, z);
    body.visibility = 0;

    const duplicate = enemyRootMesh.instantiateModelsToScene();
    duplicate.animationGroups.forEach(
      (anim) => (anim.name = anim.name.split(" ")[2])
    );
    const anims = duplicate.animationGroups;

    duplicate.rootNodes[0].parent = body;
    duplicate.rootNodes[0].position.y -= 1;
    duplicate.rootNodes[0].addRotation(0, Math.PI, 0);

    const nameMesh = createTextMesh(pawnDetail.name, "red", scene, body, 2);

    const lifeBarUi = createLifeBar(
      body,
      pawnDetail.hp,
      pawnDetail.maxHp,
      scene,
      1.4
    );
    lifeBarUi.background = "green";

    const enemyDet = {
      _id: pawnDetail._id,
      name: pawnDetail.name,
      mesh: body,
      anims,
      moving: pawnDetail.isMoving,
      attacking: false,
      hp: pawnDetail.hp,
      maxHp: pawnDetail.maxHp,
      spd: pawnDetail.spd,
      dmg: pawnDetail.dmg,
      lifeBarUi: lifeBarUi,
    };

    enemies.push(enemyDet);

    let damageTakenTimeout;
    let attackingInterval = setInterval(() => {
      if (GAMEOVER) return clearInterval(attackingInterval);
      const theEnemy = enemies.find((enemy) => enemy._id === pawnDetail._id);

      if (!theEnemy) {
        clearInterval(attackingInterval);
        return console.log("this monster is already dead");
      }

      const distance = caculateDistance(body.position, characterBox.position);

      if (distance <= 1) {
        anims.forEach((anim) => anim.name === "attack" && anim.play());

        damageTakenTimeout = setTimeout(() => {
          const currentDistance = caculateDistance(
            body.position,
            characterBox.position
          );
          if (currentDistance < 1) deductHeroLife(pawnDetail.dmg);
        }, 700);
      }
    }, 1500);

    return enemyDet;
  }

  function deductHeroLife(enemyDamage) {
    heroLife.currentHp -= enemyDamage;
    if (heroLife.currentHp <= 0) return gameOver();
    redRectangle.width = `${(heroLife.currentHp / heroLife.maxHp) * 100 * 2}px`;
    lifeTotal.text = `${heroLife.currentHp}/${heroLife.maxHp}`;
  }

  function gameOver() {
    GAMEOVER = true;
    redRectangle.width = `${(0 / heroLife.maxHp) * 100 * 2}px`;
    lifeTotal.text = `${0}/${heroLife.maxHp}`;
    animation.forEach((anim) => {
      if (anim.name.includes("idle")) anim.stop();
      anim.name === "death" ? anim.play() : anim.stop();
    });

    setTimeout(() => {
      scene.dispose();
      openLoadingScreen("GAME OVER!");
    }, 2000);
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

    if (isMoving && ourTargetPosition !== undefined) {
      const distance = caculateDistance(
        ourTargetPosition,
        characterBox.position
      );
      if (targetName === "ground") if (distance < 1) return Stop();
      if (targetName === "tree")
        if (distance < 1) return initializeAttack(ourTargetPosition);
      if (targetName.includes("enemy"))
        if (distance < 1) return initializeAttack(ourTargetPosition);

      characterBox.locallyTranslate(
        new Vector3(0, 0, characterSpeed * deltaTime)
      );
    }

    enemies.forEach((enemy) => {
      const distance = caculateDistance(
        enemy.mesh.position,
        characterBox.position
      );
      if (distance > 1) {
        const myCharacterPos = characterBox.position;
        enemy.mesh.lookAt(myCharacterPos, Math.PI);

        enemy.mesh.locallyTranslate(new Vector3(0, 0, -enemy.spd * deltaTime));
        enemy.anims.forEach((anim) => anim.name === "running" && anim.play());
      } else {
        enemy.anims.forEach((anim) => anim.name === "running" && anim.stop());
      }
    });
  });

  await scene.whenReadyAsync();
  closeLoadingScreen();
  currentScene.dispose();
  return scene;
}

export default gameScene;
