import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GUI } from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";
import Stats from "three/addons/libs/stats.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// import {gsap} from 'gsap';

const stats = new Stats();
document.body.appendChild(stats.dom);

// Player parameters
const player = {
  height: 4,
  speed: 0.08,
  sideTurnSpeed: 0.05,
  verticalTurnSpeed: 0.5,
  gravity: 0.04,
};

// essential variables
let collider_mesh_array = [];
let keyPressed = {};
let isColliding_frwd = false;
let isColliding_back = false;
let isColliding_left = false;
let isColliding_right = false;
let loaded = false;
let is_pointer_locked = false;
let object_selected = false;
let model;
let interactable_objects = [];

// camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// scene
const scene = new THREE.Scene();

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.render(scene, camera);

// keyboard event to store the status of key press
addEventListener("keydown", (e) => {
  keyPressed[e.key.toLowerCase()] = true;
});
addEventListener("keyup", (e) => {
  keyPressed[e.key.toLowerCase()] = false;
});

// pitch and yaw object creation
// pitch stores the camera as a child and yaw stores pitch as a child
// when pitch and yaw rotate the camera moves inherently as the camera is a child of yaw and pitch
var pitchObj = new THREE.Object3D();
pitchObj.add(camera);

var yawObj = new THREE.Object3D();
yawObj.position.y = player.height;
yawObj.position.z = 15;
yawObj.add(pitchObj);
scene.add(yawObj);

var player_obj = new THREE.Object3D();
player_obj.add(yawObj);

// Player movement dunction
function player_movement() {
  if (is_pointer_locked && keyPressed["w"] && !isColliding_frwd) {
    yawObj.position.x += Math.sin(-yawObj.rotation.y) * player.speed;
    yawObj.position.z += -Math.cos(-yawObj.rotation.y) * player.speed;
  }
  if (is_pointer_locked && keyPressed["s"] && !isColliding_back) {
    yawObj.position.x -= Math.sin(-yawObj.rotation.y) * player.speed;
    yawObj.position.z -= -Math.cos(-yawObj.rotation.y) * player.speed;
  }
  if (is_pointer_locked && keyPressed["a"] && !isColliding_left) {
    yawObj.position.x -=
      Math.sin(-yawObj.rotation.y + Math.PI / 2) * player.speed;
    yawObj.position.z -=
      -Math.cos(-yawObj.rotation.y + Math.PI / 2) * player.speed;
  }
  if (is_pointer_locked && keyPressed["d"] && !isColliding_right) {
    yawObj.position.x -=
      Math.sin(-yawObj.rotation.y - Math.PI / 2) * player.speed;
    yawObj.position.z -=
      -Math.cos(-yawObj.rotation.y - Math.PI / 2) * player.speed;
  }
  if (keyPressed["q"]) {
    yawObj.position.y += player.speed * 0.2;
  }
  if (keyPressed["e"]) {
    yawObj.position.y -= player.speed * 0.2;
  }
}

// Pointer lock over redner element

function lock_pointer(){
  console.log("before locking")
  if (!is_pointer_locked && !object_selected) {
    console.log("locking")
    rendererEl.requestPointerLock();
  }
} 

addEventListener("keyup", (e)=>{
  if(e.key == "Escape"){
    document.exitPointerLock()
    is_pointer_locked = false
  }
})

function change_lock_state(){
  if(is_pointer_locked) is_pointer_locked = false;
  else is_pointer_locked = true
  console.log("lock status changed:", is_pointer_locked)
}
const rendererEl = renderer.domElement;
rendererEl.addEventListener("click", lock_pointer);

// pointer unlock
document.addEventListener("pointerlockchange", change_lock_state);

// raycast
const raycast_frwd = new THREE.Raycaster();
const raycast_back = new THREE.Raycaster();
const raycast_left = new THREE.Raycaster();
const raycast_right = new THREE.Raycaster();
const raycast_down = new THREE.Raycaster();

raycast_frwd.far = 2;
raycast_back.far = 2;
raycast_left.far = 2;
raycast_right.far = 2;
raycast_down.far = 10;

// collision threshold
let surrounding_raycast_dist = 1.5;
let height_raycast_dist = 2;

// function to check collisions
function update() {
  const raycast_origin = yawObj.position; //raycast origin

  // raycast directions
  const frwd_direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
    yawObj.quaternion
  );
  const back_direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
    yawObj.quaternion
  );
  const left_direction = new THREE.Vector3(-1, 0, 0).applyQuaternion(
    yawObj.quaternion
  );
  const right_direction = new THREE.Vector3(1, 0, 0).applyQuaternion(
    yawObj.quaternion
  );
  const bottom_direction = new THREE.Vector3(0, -1, 0).applyQuaternion(
    yawObj.quaternion
  );

  raycast_frwd.set(raycast_origin, frwd_direction);
  raycast_back.set(raycast_origin, back_direction);
  raycast_left.set(raycast_origin, left_direction);
  raycast_right.set(raycast_origin, right_direction);
  raycast_down.set(raycast_origin, bottom_direction);

  const intersects_frwd = raycast_frwd.intersectObjects(collider_mesh_array);
  const intersects_back = raycast_back.intersectObjects(collider_mesh_array);
  const intersects_left = raycast_left.intersectObjects(collider_mesh_array);
  const intersects_right = raycast_right.intersectObjects(collider_mesh_array);
  const intersects_down = raycast_down.intersectObjects(collider_mesh_array);

  // logic to stop moving when collision is detected
  if (
    intersects_frwd.length > 0 &&
    intersects_frwd[0].distance < surrounding_raycast_dist
  ) {
    isColliding_frwd = true;
  } else {
    isColliding_frwd = false;
  }

  if (
    intersects_back.length > 0 &&
    intersects_back[0].distance < surrounding_raycast_dist
  ) {
    isColliding_back = true;
  } else {
    isColliding_back = false;
  }

  if (
    intersects_left.length > 0 &&
    intersects_left[0].distance < surrounding_raycast_dist
  ) {
    isColliding_left = true;
  } else {
    isColliding_left = false;
  }

  if (
    intersects_right.length > 0 &&
    intersects_right[0].distance < surrounding_raycast_dist
  ) {
    isColliding_right = true;
  } else {
    isColliding_right = false;
  }

  if (
    intersects_down.length > 0 &&
    intersects_down[0].distance < height_raycast_dist
  ) {
    yawObj.position.y = intersects_down[0].point.y + height_raycast_dist;
  } else if (
    intersects_down.length > 0 &&
    intersects_down[0].distance > height_raycast_dist + 0.1
  ) {
    yawObj.position.y -= intersects_down[0].distance * player.gravity;
  }
}

// Camera look around mechanic
addEventListener("mousemove", (e) => {
  if (is_pointer_locked && e.movementX) {
    yawObj.rotation.y -= e.movementX * 0.002; //holds camera as a child
  }
  if (is_pointer_locked && e.movementY) {
    pitchObj.rotation.x -= e.movementY * 0.002;
    pitchObj.rotation.x = Math.max(
      //limiting turnup and down angle
      -Math.PI / 2,
      Math.min(Math.PI / 2, pitchObj.rotation.x)
    );
  }
});

// Load manager
const manager = new THREE.LoadingManager();
manager.onStart = function () {
  console.log("started");
};
manager.onProgress = function () {
  console.log("loading");
};
manager.onLoad = function () {
  collider_mesh_array = model.children[2].children; //pushing the collider object to an array
  loaded = true;
  collider_mesh_array.forEach((element) => {
    element.material.wireframe = true;
    element.material.color.set(0xff0000);
    element.material.transparent = false;
  });
  interactable_objects = [box1, box2, box3, neptune, chess_set];
};
manager.onError = function (e) {
  console.log("error: ", e);
};

// lighting
const light = new THREE.AmbientLight();
scene.add(light);
renderer.shadowMapDebug = true;

const point = new THREE.PointLight(0xff0000, 20);
point.position.y = 5.5;
point.castShadow = true;
// scene.add(point)

const direction = new THREE.DirectionalLight();
direction.intensity = 10;
direction.castShadow = true;
scene.add(direction);
renderer.shadowMap.antialias = true;

//GLTF loader
const loader = new GLTFLoader(manager);
loader.load("assets/Museum_Collider.glb", (gltf) => {
  model = gltf.scene;
  model.traverse((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  scene.add(model);
});

// test box
const box1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial()
);
box1.position.y = 4;
// scene.add(box1);

const box2 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial()
);
box2.position.y = 4;
box2.position.x = -2;
// scene.add(box2);

const box3 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial()
);
box3.position.y = 4;
box3.position.x = 2;
// scene.add(box3);

const blur_material = new THREE.MeshPhysicalMaterial();
blur_material.transmission = 0.5;
blur_material.thickness = 0.1;
blur_material.roughness = 0.4;
const blur_plane = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50, 12, 12),
  blur_material
);
blur_material.side = THREE.DoubleSide;
blur_plane.rotateX(Math.PI);

// crosshair raycast
const crosshair_raycast = new THREE.Raycaster();
crosshair_raycast.far = 5;
let prev_selected = null;
let crosshair_intersects = [];

function crosshair_logic() {
  crosshair_raycast.set(
    camera.getWorldPosition(new THREE.Vector3()),
    camera.getWorldDirection(new THREE.Vector3())
  );

  crosshair_intersects =
    crosshair_raycast.intersectObjects(interactable_objects);

  if (crosshair_intersects.length > 0 && !object_selected) {
    prev_selected = crosshair_intersects[0];
    crosshair_intersects[0].object.material.color.set(0xff00000);
    const selectedObject = prev_selected.object;
    addSelectedObject(selectedObject);
    outlinePass.selectedObjects = selectedObjects;
    gsap.to(crosshair_intersects[0].object.scale, {
      x: 1.2,
      y: 1.2,
      z: 1.2,
      duration: 1,
    });
  } else {
    if (prev_selected != null) {
      prev_selected.object.material.color.set(0xffffff);
      outlinePass.selectedObjects = [];
      gsap.to(prev_selected.object.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1,
      });
    }
    
  }
}

let neptune;
loader.load("assets/neptu_biblioteca_museu_victor_balaguer.glb", (gltf) => {
  neptune = gltf.scene;
  neptune.position.y = 3;
  neptune.position.x = -2;
  // neptune.scale.set(10, 10, 10)
  console.log(neptune);
  scene.add(neptune);
});

let chess_set;
loader.load("assets/lewis_chess_set.glb", (gltf) => {
  chess_set = gltf.scene;
  chess_set.position.y = 3;
  chess_set.position.x = 2;
  scene.add(chess_set);
});

class new_scene{
  constructor(obj){
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100)
    this.scene = new THREE.Scene()
    this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true})
    this.obj = obj.clone()

    this.initiate()
    
  }

  initiate(){
    this.camera.position.z = 4;
    const renderEl_2 = this.renderer.domElement
    this.renderer.setSize(window.innerWidth/3, window.innerHeight/3)
    document.body.appendChild(renderEl_2)
    renderEl_2.className = "render"
    this.controls = new OrbitControls(this.camera, renderEl_2)
    this.scene.add(this.obj)

    const ambient = new THREE.AmbientLight(0xffffff, 2)
    this.scene.add(ambient)
  }

  destroy() {
    document.body.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    this.camera = null;
    this.scene = null;
    this.renderer = null;
    object_selected = false
  }

} 

let scene_2 = null



let హలో = 23
console.log(హలో)

function animation(){
  scene_2.renderer.render(scene_2.scene, scene_2.camera)
  if(scene_2 == null) cancelAnimationFrame()
  else requestAnimationFrame(animation)
}

addEventListener("mouseup", () => {
  crosshair_intersects =
    crosshair_raycast.intersectObjects(interactable_objects);
  if (crosshair_intersects.length > 0 && !object_selected) {
    const obj = crosshair_intersects[0].object
    scene_2 = new new_scene(obj)
    document.exitPointerLock();
    object_selected = true
    animation()
  }
});

addEventListener("keyup", (e)=>{
  if(e.key == 'x' && scene_2 != null) {
    scene_2.destroy()
    scene_2 = null
    lock_pointer()
  }
})

let composer, effectFXAA, outlinePass;

composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
composer.addPass(outlinePass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms["resolution"].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(effectFXAA);

let selectedObjects = [];

function addSelectedObject(object) {
  selectedObjects = [];
  selectedObjects.push(object);
}

// resize window listener
addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
});

// gui for collision threshold setting
const gui = new GUI();
let obj = { threshold: 1 };
const collison_threshold_folder = gui.addFolder("Collision Threshold");
collison_threshold_folder
  .add(obj, "threshold")
  .min(0)
  .max(2)
  .step(0.1)
  .name("Surrounding Threshold")
  .onChange((value) => {
    surrounding_raycast_dist = value;
  });
collison_threshold_folder
  .add(obj, "threshold")
  .min(0)
  .max(5)
  .step(0.1)
  .name("Height Threshold")
  .onChange((value) => {
    height_raycast_dist = value;
  });

// animate
function animate() {
  // renderer.render(scene, camera);
  composer.render();
  requestAnimationFrame(animate);
  player_movement(); //player player_movement
  if (loaded) update(); //checks collision
  crosshair_logic();
  box1.rotation.x += 0.01;
  box1.rotation.y += 0.01;

  box2.rotation.x += 0.01;
  box2.rotation.y += 0.01;

  box3.rotation.x += 0.01;
  box3.rotation.y += 0.01;

  stats.update();
}
animate();
