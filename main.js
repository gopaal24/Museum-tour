import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Stats from "three/addons/libs/stats.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

import { TWEEN } from "https://unpkg.com/three@0.139.0/examples/jsm/libs/tween.module.min.js";
const stats = new Stats();
document.body.appendChild(stats.dom);

// Player parameters
const player = {
  height: 4,
  speed: 8,
  sideTurnSpeed: 0.05,
  verticalTurnSpeed: 0.5,
  gravity: 0.18,
};

// html elements
const container = document.querySelector(".container");
const space_3d = document.querySelector(".image-container");
const close_btn = document.querySelector(".close-btn");
const loading_screen = document.querySelector(".loading-container");
const crosshair = document.querySelector("#crosshair");
const start_btn = document.querySelector(".start-btn");
const instructions_el = document.querySelector(".instructions");
const container_1 = document.querySelector(".container1");
const container_2 = document.querySelector(".container2");
const container_3 = document.querySelector(".container3");

// essential variables
let collider_mesh_array;
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
let object_clicked = false;
let hotspot_view = false;
let artifact_pos = [];

// camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const hotspot_cam = new THREE.PerspectiveCamera(
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

function register_keydown(e){
  keyPressed[e.key.toLowerCase()] = true;
}

function register_keyup(e){
  keyPressed[e.key.toLowerCase()] = false;
}

addEventListener("keydown", register_keydown);
addEventListener("keyup", register_keyup);

// pitch and yaw object creation
// pitch stores the camera as a child and yaw stores pitch as a child
// when pitch and yaw rotate the camera moves inherently as the camera is a child of yaw and pitch
var pitchObj = new THREE.Object3D();
pitchObj.add(camera);

var yawObj = new THREE.Object3D();
yawObj.add(pitchObj);
scene.add(yawObj);

var player_obj = new THREE.Object3D();
player_obj.position.y = player.height;
player_obj.position.z = 15;
player_obj.add(yawObj);
scene.add(player_obj);

const clock = new THREE.Clock();
let delta = clock.getDelta();

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

new RGBELoader().load("assets/museum_of_ethnography_2k.hdr", function (hdri) {
  hdri.mapping = THREE.EquirectangularReflectionMapping;

  scene.environment = hdri;
  scene.environmentIntensity = 0.3;
});

// Load manager
const manager = new THREE.LoadingManager();
manager.onStart = function () {
  console.log("started");
};
manager.onProgress = function () {
  console.log("loading");
};

let jsonData;

function fetchdata() {
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      jsonData = data;
    });
}

let data;

manager.onLoad = function () {
  instructions_el.style.display = "flex";
  let collider_mesh = model.children[0].children[0]; //pushing the collider object to an array
  collider_mesh_array = model.children[0].children[0].children; //pushing the collider object to an array
  loaded = true;
  const transparent_boxes =
    model.children[0].children[1].children[0].children[43];
  console.log(model);
  transparent_boxes.traverse((mesh) => {
    mesh.material.transparent = true;
    mesh.material.opacity = 0;
  });
  fetchdata();
  collider_mesh.traverse((mesh) => {
    if (mesh.material != undefined) {
      mesh.material.transparent = true;
      mesh.material.opacity = 0;
    }
  });
  interactable_objects = model.children[0].children[2].children;
  loading_screen.style.display = "none";
  crosshair.style.display = "block";

  interactable_objects.forEach((element) => {
    artifact_pos.push(element.position);
  });

 start_btn.addEventListener("click", () => {
    console.log("clicked");
    instructions_el.style.display = "none";
    rendererEl.requestPointerLock();
  });
};
manager.onError = function (e) {
  console.log("error: ", e);
};

// lighting
const light = new THREE.AmbientLight();
scene.add(light);

//GLTF loader
const loader = new GLTFLoader(manager);
loader.load("assets/museum_final_01.glb", (gltf) => {
  model = gltf.scene;
  model.traverse((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  scene.add(model);
});

// ui elements
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0px";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

const hover_name = document.createElement("h2");
const hover_card = document.createElement("div");
hover_card.appendChild(hover_name);
hover_card.classList.add("ui");
hover_card.classList.add("hide");
const hover_card_container = new CSS2DObject(hover_card);
scene.add(hover_card_container);

const right_details_container = document.createElement("div");

const name_info = document.createElement("h2");
const name_card = document.createElement("div");
name_card.appendChild(name_info);
name_card.classList.add("ui");
right_details_container.appendChild(name_card);

const time_info = document.createElement("h2");
const time_card = document.createElement("div");
time_card.appendChild(time_info);
time_card.classList.add("ui");
right_details_container.appendChild(time_card);

const data_info = document.createElement("h2");
const data_card = document.createElement("div");
data_card.appendChild(data_info);
data_card.classList.add("ui");
right_details_container.appendChild(data_card);

right_details_container.classList.add("hide");
right_details_container.classList.add("right-details");

const right_details_object = new CSS2DObject(right_details_container);
scene.add(right_details_object);

const left_details_container = document.createElement("div");
const left_img = document.createElement("img");
left_img.classList.add("image");
left_details_container.appendChild(left_img);
left_details_container.classList.add("ui");
left_details_container.classList.add("hide");
const left_details_object = new CSS2DObject(left_details_container);
scene.add(left_details_object);

// crosshair raycast
const crosshair_raycast = new THREE.Raycaster();
crosshair_raycast.far = 10;
let prev_selected = null;
let crosshair_intersects = [];

let height = space_3d.offsetHeight;
let width = space_3d.offsetWidth;

let composer, effectFXAA, outlinePass;

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.outputEncoding = THREE.sRGBEncoding;

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

// pointer unlock
document.addEventListener("pointerlockchange", function () {
  change_lock_state();
});

const rendererEl = renderer.domElement;
function lock_pointer() {
  if (!is_pointer_locked) {
    rendererEl.requestPointerLock();
  }
}

function change_lock_state() {
  is_pointer_locked = is_pointer_locked ? false : true;
  console.log("change", is_pointer_locked);
}
rendererEl.addEventListener("click", () => {
  if (!hotspot_view) {
    lock_pointer();
  }
});

// resize window listener
addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  hotspot_cam.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
  hotspot_cam.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
});

const controls = new OrbitControls(hotspot_cam, renderer.domElement);

function hotspot_cam_view() {
  hotspot_cam.position.set(-0.8, 7, 19);
  // hotspot_cam.lookAt(25, player.height, 25);

  controls.enabled = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  console.log("is_pointer_locked:", is_pointer_locked);
  document.exitPointerLock();

  console.log("is_pointer_locked:", is_pointer_locked);

  const hotspot_obj = [];
  const cam_positions = [
    { x: 2.2, y: 3.56, z: 7.9 },
    { x: -6.5, y: 3.5, z: 8 },
    { x: -3.8, y: 5, z: -18 },
    { x: 2, y: 4.2, z: -11 },
    { x: -6, y: 3.8, z: -17 },
    { x: 4, y: 3.5, z: 6 },
    { x: -6, y: 3.5, z: 6 },
    { x: 4, y: 10, z: 12 },
    { x: -12, y: 8, z: 2 },
    { x: -12, y: 8, z: 22 },
    { x: 0, y: 14, z: -9 },
    { x: -8, y: 16, z: -23 },
  ];
  const hotspot_positions = [
    { x: 3.2, y: 2.56, z: 10.87 },
    { x: -4.04, y: 2.56, z: 10.87 },
    { x: -0.465, y: 2.33, z: -9.752 },
    { x: 6.175, y: 2.823, z: -22.03 },
    { x: -6.513, y: 2.61, z: -25.75 },
    { x: 12.211, y: 3.13, z: 3.73 },
    { x: -12.566, y: 3.011, z: 3.378 },
    { x: 12.649, y: 9.756, z: 9.868 },
    { x: -13.195, y: 9.2, z: -2.43 },
    { x: -14.513, y: 9.755, z: 22.71 },
    { x: 0, y: 13.138, z: -14.75 },
    { x: -7.915, y: 15.834, z: -27.829 },
  ];

  const raycast = new THREE.Raycaster();
  let mouse = {};

  let scene_2 = null;

  class new_scene {
    constructor(obj) {
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.obj = obj.clone();

      this.height = space_3d.clientHeight;
      this.width = space_3d.clientWidth;

      this.size = 5;
      const scene_ = this.scene;
      this.test = new THREE.Mesh(
        new THREE.BoxGeometry(this.size, this.size, this.size),
        new THREE.MeshBasicMaterial()
      );
      new RGBELoader().load(
        "assets/museum_of_ethnography_2k.hdr",
        function (hdri) {
          hdri.mapping = THREE.EquirectangularReflectionMapping;
          scene_.environment = hdri;
        }
      );
      // this.scene.add(this.test)

      this.camera = new THREE.PerspectiveCamera(
        45,
        this.width / this.height,
        0.1,
        10000
      );
      this.initiate();
    }

    initiate() {
      const renderEl_2 = this.renderer.domElement;
      this.renderer.setSize(this.width, this.height);
      space_3d.appendChild(renderEl_2);
      this.controls = new OrbitControls(this.camera, renderEl_2);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05
      this.obj.position.set(0, 0, 0);
      this.obj.rotation.set(-Math.PI / 2, Math.PI, Math.PI / 5);
      this.scene.add(this.obj);
      const size = new THREE.Box3()
        .setFromObject(this.obj)
        .getSize(new THREE.Vector3());
      console.log(size);
      this.camera.position.set(0, size.y - 100, size.z + 300);
      this.camera.lookAt(this.obj.position);
      this.controls.target = this.obj.position;

      const ambient = new THREE.AmbientLight(0xffffff, 2);
      this.scene.add(ambient);

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    destroy() {
      space_3d.removeChild(this.renderer.domElement);
      this.renderer.dispose();
      this.camera = null;
      this.scene = null;
      this.renderer = null;
      object_selected = false;
    }
  }

  let ui_added = false;
  let ui_object = null;

  function change_ui_pos() {
    const clickedObjectPosition = new THREE.Vector3();
    ui_object.getWorldPosition(clickedObjectPosition);

    const size = new THREE.Box3()
      .setFromObject(ui_object)
      .getSize(new THREE.Vector3());

    let offsetDirection = new THREE.Vector3(0, 0, 0);
    let offsetDirection_ = new THREE.Vector3(0, 0, 0);
    let offsetDistance = 0;

    const dir = new THREE.Vector3();
    dir
      .subVectors(
        hotspot_cam.getWorldPosition(new THREE.Vector3()),
        clickedObjectPosition
      )
      .normalize();

    console.log("direction", dir);
    console.log(-0.2 > -0.5);

    if (dir.z < -0.02 && dir.x > -0.5 && dir.x < 0.5) {
      console.log("z");
      offsetDirection = new THREE.Vector3(-1, 0, 0);
      offsetDirection_ = new THREE.Vector3(1, 0, 0);
      offsetDistance = size.x / 2;
    }
    else if (dir.x > 0.02 && dir.z > -0.5 && dir.z < 0.5) {
      console.log("x");
      offsetDistance = size.z / 2;
      offsetDirection = new THREE.Vector3(0, 0, -1);
      offsetDirection_ = new THREE.Vector3(0, 0, 1);
    }
    if (dir.z > 0.02 && dir.x > -0.5 && dir.x < 0.5) {
      console.log("z");
      offsetDirection = new THREE.Vector3(1, 0, 0);
      offsetDirection_ = new THREE.Vector3(-1, 0, 0);
      offsetDistance = size.x / 2;
    }
    if (dir.x < -0.02 && dir.z > -0.5 && dir.z < 0.5) {
      console.log("x");
      offsetDistance = size.z / 2;
      offsetDirection = new THREE.Vector3(0, 0, 1);
      offsetDirection_ = new THREE.Vector3(0, 0, -1);
    }

    // offsetDirection.applyQuaternion(yawObj.quaternion);

    const offsetPosition = clickedObjectPosition
      .clone()
      .add(offsetDirection.clone().multiplyScalar(offsetDistance));

    // offsetDirection_.applyQuaternion(yawObj.quaternion);
    const offsetPosition_ = clickedObjectPosition
      .clone()
      .add(offsetDirection_.clone().multiplyScalar(offsetDistance));

    right_details_container.classList.remove("hide");
    right_details_container.classList.add("show");

    left_details_container.classList.remove("hide");
    left_details_container.classList.add("show");

    if (Math.abs(dir.x) < Math.abs(dir.z)) {
      offsetPosition_.z = offsetPosition.z;
    } else {
      offsetPosition_.x = offsetPosition.x;
    }

    console.log(offsetPosition);
    console.log(offsetPosition_);
    console.log(size);

    right_details_container.center = new THREE.Vector2(0, 0);
    right_details_object.center = new THREE.Vector2(0, 0);
    left_details_object.center = new THREE.Vector2(1, 0);
    left_details_container.center = new THREE.Vector2(1, 0);

    right_details_object.position.set(
      offsetPosition.x,
      offsetPosition.y + size.y / 2,
      offsetPosition.z
    );
    left_details_object.position.set(
      offsetPosition_.x,
      offsetPosition.y + size.y / 2,
      offsetPosition_.z
    );
  }

  function handleObjectClick(e){
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycast.setFromCamera(mouse, hotspot_cam);
    if(ui_added) change_ui_pos()

    const intersects = raycast.intersectObjects(interactable_objects);
    if (intersects.length > 0) {
      ui_added = true;
      console.log("clicked");
      object_clicked = true;
      const clickedObject = intersects[0].object;
      const pos = clickedObject.getWorldPosition(new THREE.Vector3());
      const size = new THREE.Box3()
        .setFromObject(clickedObject)
        .getSize(new THREE.Vector3());

      data = jsonData[clickedObject.name];

      name_info.textContent = data.name;
      time_info.textContent = data.period;
      data_info.textContent = data.info;
      left_img.src = data.img;

      ui_object = clickedObject;
      const clickedObjectPosition = new THREE.Vector3();
      clickedObject.getWorldPosition(clickedObjectPosition);

      let offsetDirection = new THREE.Vector3(0, 0, 0);
      let offsetDirection_ = new THREE.Vector3(0, 0, 0);
      let offsetDistance = 0;

      const dir = new THREE.Vector3();
      dir
        .subVectors(
          hotspot_cam.getWorldPosition(new THREE.Vector3()),
          clickedObjectPosition
        )
        .normalize();

      console.log("direction", dir);
      console.log(-0.2 > -0.5);

      if (dir.z < -0.02 && dir.x > -0.7 && dir.x < 0.7) {
        console.log("z");
        offsetDirection = new THREE.Vector3(-1, 0, 0);
        offsetDirection_ = new THREE.Vector3(1, 0, 0);
        offsetDistance = size.x / 2;
      }
      if (dir.x > 0.02 && dir.z > -0.7 && dir.z < 0.7) {
        console.log("x");
        offsetDistance = size.z / 2;
        offsetDirection = new THREE.Vector3(0, 0, -1);
        offsetDirection_ = new THREE.Vector3(0, 0, 1);
      }
      if (dir.z > 0.02 && dir.x > -0.7 && dir.x < 0.7) {
        console.log("z");
        offsetDirection = new THREE.Vector3(1, 0, 0);
        offsetDirection_ = new THREE.Vector3(-1, 0, 0);
        offsetDistance = size.x / 2;
      }
      if (dir.x < -0.02 && dir.z > -0.7 && dir.z < 0.7) {
        console.log("x");
        offsetDistance = size.z / 2;
        offsetDirection = new THREE.Vector3(0, 0, 1);
        offsetDirection_ = new THREE.Vector3(0, 0, -1);
      }

      // offsetDirection.applyQuaternion(yawObj.quaternion);

      const offsetPosition = clickedObjectPosition
        .clone()
        .add(offsetDirection.clone().multiplyScalar(offsetDistance));

      // offsetDirection_.applyQuaternion(yawObj.quaternion);
      const offsetPosition_ = clickedObjectPosition
        .clone()
        .add(offsetDirection_.clone().multiplyScalar(offsetDistance));

      right_details_container.classList.remove("hide");
      right_details_container.classList.add("show");

      left_details_container.classList.remove("hide");
      left_details_container.classList.add("show");

      if (Math.abs(dir.x) < Math.abs(dir.z)) {
        offsetPosition_.z = offsetPosition.z;
      } else {
        offsetPosition_.x = offsetPosition.x;
      } 

      right_details_container.center = new THREE.Vector2(0, 0);
      right_details_object.center = new THREE.Vector2(0, 0);
      left_details_object.center = new THREE.Vector2(1, 0);
      left_details_container.center = new THREE.Vector2(1, 0);

      right_details_object.position.set(
        offsetPosition.x,
        offsetPosition.y + size.y / 2,
        offsetPosition.z
      );
      left_details_object.position.set(
        offsetPosition_.x,
        offsetPosition.y + size.y / 2,
        offsetPosition_.z
      );
    }
  }

  addEventListener("mouseup", handleObjectClick);

  function close_ui() {
    object_clicked = false;
    ui_added = false
    ui_object = null

    right_details_container.classList.remove("show");
    right_details_container.classList.add("hide");

    left_details_container.classList.remove("show");
    left_details_container.classList.add("hide");
  }

  function destroy_scene(){
    scene_2.destroy();
    scene_2 = null;
    container.style.display = "none";
  }

  close_btn.addEventListener("click", destroy_scene);

  function animation() {
    scene_2.renderer.render(scene_2.scene, scene_2.camera);
    scene_2.controls.update()
    if (scene_2 == null) cancelAnimationFrame();
    else requestAnimationFrame(animation);
  }


  function open_detailed_popup(e){
    close_ui();

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycast.setFromCamera(mouse, hotspot_cam);

    const intersects = raycast.intersectObjects(interactable_objects);

    if (intersects.length > 0 && !object_selected) {
      const obj = intersects[0].object;
      console.log(obj);
      container.style.display = "flex";
      scene_2 = new new_scene(obj);
      object_selected = true;
      animation();

      console.log(player_obj.position);
      let pos = obj.getWorldPosition(new THREE.Vector3());
      console.log(pos);
      console.log(player_obj.position);
    }
  }

  addEventListener("dblclick", open_detailed_popup);

  let current_viewing_artifact = -1;

  console.log(hotspot_positions, hotspot_obj);
  let obj = new THREE.Object3D();
  let interpolatedQuaternion;

  function change_cam_view() {
    gsap.to(hotspot_cam.position, {
      x: cam_positions[current_viewing_artifact].x + 2,
      y: cam_positions[current_viewing_artifact].y + 1,
      z: cam_positions[current_viewing_artifact].z - 2,
      duration: 2,
    });
    gsap.to(controls.target, {
      x: hotspot_positions[current_viewing_artifact].x,
      y: hotspot_positions[current_viewing_artifact].y,
      z: hotspot_positions[current_viewing_artifact].z,
      duration: 2,
    });
  }

  function camera_navigation(e){
    if (e.key == "ArrowRight" && hotspot_view) {
      close_ui();
      if (current_viewing_artifact >= hotspot_positions.length - 1)
        current_viewing_artifact = 0;
      else current_viewing_artifact += 1;
      change_cam_view();
    }
    if (e.key == "ArrowLeft" && hotspot_view) {
      close_ui();
      if (current_viewing_artifact <= 0)
        current_viewing_artifact = hotspot_positions.length - 1;
      else current_viewing_artifact -= 1;
      change_cam_view();
    }
  }

  addEventListener("keyup", camera_navigation);
}

function player_cam() {
  controls.enabled = false;

  console.log("is_pointer_locked:", is_pointer_locked);
  is_pointer_locked = false;

  let ui_added = false;
  let ui_object = null;

  function handleObjectClick(event) {
    // Get the clicked object
    crosshair_intersects =
      crosshair_raycast.intersectObjects(interactable_objects);

    if (crosshair_intersects.length > 0) {
      ui_added = true;
      console.log("clicked");
      object_clicked = true;
      const clickedObject = crosshair_intersects[0].object;
      const pos = clickedObject.getWorldPosition(new THREE.Vector3());
      const size = new THREE.Box3()
        .setFromObject(clickedObject)
        .getSize(new THREE.Vector3());

      data = jsonData[clickedObject.name];

      name_info.textContent = data.name;
      time_info.textContent = data.period;
      data_info.textContent = data.info;
      left_img.src = data.img;

      ui_object = clickedObject;
      const clickedObjectPosition = new THREE.Vector3();
      clickedObject.getWorldPosition(clickedObjectPosition);

      let offsetDirection = new THREE.Vector3(0, 0, 0);
      let offsetDirection_ = new THREE.Vector3(0, 0, 0);
      let offsetDistance = 0;

      const dir = new THREE.Vector3();
      dir
        .subVectors(
          camera.getWorldPosition(new THREE.Vector3()),
          clickedObjectPosition
        )
        .normalize();

      console.log("direction", dir);
      console.log(-0.2 > -0.5);

      if (dir.z < -0.02 && dir.x > -0.5 && dir.x < 0.5) {
        console.log("z");
        offsetDirection = new THREE.Vector3(-1, 0, 0);
        offsetDirection_ = new THREE.Vector3(1, 0, 0);
        offsetDistance = size.x / 2;
      }
      if (dir.x > 0.02 && dir.z > -0.5 && dir.z < 0.5) {
        console.log("x");
        offsetDistance = size.z / 2;
        offsetDirection = new THREE.Vector3(0, 0, -1);
        offsetDirection_ = new THREE.Vector3(0, 0, 1);
      }
      if (dir.z > 0.02 && dir.x > -0.5 && dir.x < 0.5) {
        console.log("z");
        offsetDirection = new THREE.Vector3(1, 0, 0);
        offsetDirection_ = new THREE.Vector3(-1, 0, 0);
        offsetDistance = size.x / 2;
      }
      if (dir.x < -0.02 && dir.z > -0.5 && dir.z < 0.5) {
        console.log("x");
        offsetDistance = size.z / 2;
        offsetDirection = new THREE.Vector3(0, 0, 1);
        offsetDirection_ = new THREE.Vector3(0, 0, -1);
      }

      // offsetDirection.applyQuaternion(yawObj.quaternion);

      const offsetPosition = clickedObjectPosition
        .clone()
        .add(offsetDirection.clone().multiplyScalar(offsetDistance));

      // offsetDirection_.applyQuaternion(yawObj.quaternion);
      const offsetPosition_ = clickedObjectPosition
        .clone()
        .add(offsetDirection_.clone().multiplyScalar(offsetDistance));

      right_details_container.classList.remove("hide");
      right_details_container.classList.add("show");

      left_details_container.classList.remove("hide");
      left_details_container.classList.add("show");

      if (Math.abs(dir.x) < Math.abs(dir.z)) {
        offsetPosition_.z = offsetPosition.z;
      } else {
        offsetPosition_.x = offsetPosition.x;
      }

      console.log(offsetPosition);
      console.log(offsetPosition_);
      console.log(size);

      right_details_container.center = new THREE.Vector2(0, 0);
      right_details_object.center = new THREE.Vector2(0, 0);
      left_details_object.center = new THREE.Vector2(1, 0);
      left_details_container.center = new THREE.Vector2(1, 0);

      right_details_object.position.set(
        offsetPosition.x,
        offsetPosition.y + size.y / 2,
        offsetPosition.z
      );
      left_details_object.position.set(
        offsetPosition_.x,
        offsetPosition.y + size.y / 2,
        offsetPosition_.z
      );
    }
  }

  function change_ui_pos() {
    const clickedObjectPosition = new THREE.Vector3();
    ui_object.getWorldPosition(clickedObjectPosition);

    const size = new THREE.Box3()
      .setFromObject(ui_object)
      .getSize(new THREE.Vector3());

    let offsetDirection = new THREE.Vector3(0, 0, 0);
    let offsetDirection_ = new THREE.Vector3(0, 0, 0);
    let offsetDistance = 0;

    const dir = new THREE.Vector3();
    dir
      .subVectors(
        camera.getWorldPosition(new THREE.Vector3()),
        clickedObjectPosition
      )
      .normalize();

    console.log("direction", dir);
    console.log(-0.2 > -0.5);

    if (dir.z < -0.02 && dir.x > -0.5 && dir.x < 0.5) {
      console.log("z");
      offsetDirection = new THREE.Vector3(-1, 0, 0);
      offsetDirection_ = new THREE.Vector3(1, 0, 0);
      offsetDistance = size.x / 2;
    }
    else if (dir.x > 0.02 && dir.z > -0.5 && dir.z < 0.5) {
      console.log("x");
      offsetDistance = size.z / 2;
      offsetDirection = new THREE.Vector3(0, 0, -1);
      offsetDirection_ = new THREE.Vector3(0, 0, 1);
    }
    if (dir.z > 0.02 && dir.x > -0.5 && dir.x < 0.5) {
      console.log("z");
      offsetDirection = new THREE.Vector3(1, 0, 0);
      offsetDirection_ = new THREE.Vector3(-1, 0, 0);
      offsetDistance = size.x / 2;
    }
    if (dir.x < -0.02 && dir.z > -0.5 && dir.z < 0.5) {
      console.log("x");
      offsetDistance = size.z / 2;
      offsetDirection = new THREE.Vector3(0, 0, 1);
      offsetDirection_ = new THREE.Vector3(0, 0, -1);
    }

    // offsetDirection.applyQuaternion(yawObj.quaternion);

    const offsetPosition = clickedObjectPosition
      .clone()
      .add(offsetDirection.clone().multiplyScalar(offsetDistance));

    // offsetDirection_.applyQuaternion(yawObj.quaternion);
    const offsetPosition_ = clickedObjectPosition
      .clone()
      .add(offsetDirection_.clone().multiplyScalar(offsetDistance));

    right_details_container.classList.remove("hide");
    right_details_container.classList.add("show");

    left_details_container.classList.remove("hide");
    left_details_container.classList.add("show");

    if (Math.abs(dir.x) < Math.abs(dir.z)) {
      offsetPosition_.z = offsetPosition.z;
    } else {
      offsetPosition_.x = offsetPosition.x;
    }

    console.log(offsetPosition);
    console.log(offsetPosition_);
    console.log(size);

    right_details_container.center = new THREE.Vector2(0, 0);
    right_details_object.center = new THREE.Vector2(0, 0);
    left_details_object.center = new THREE.Vector2(1, 0);
    left_details_container.center = new THREE.Vector2(1, 0);

    right_details_object.position.set(
      offsetPosition.x,
      offsetPosition.y + size.y / 2,
      offsetPosition.z
    );
    left_details_object.position.set(
      offsetPosition_.x,
      offsetPosition.y + size.y / 2,
      offsetPosition_.z
    );
  }

  // Player movement dunction
  function player_movement() {
    if (
      is_pointer_locked &&
      keyPressed["w"] &&
      !isColliding_frwd &&
      !hotspot_view
    ) {
      player_obj.position.x +=
        Math.sin(-yawObj.rotation.y) * player.speed * delta;
      player_obj.position.z +=
        -Math.cos(-yawObj.rotation.y) * player.speed * delta;
      if (ui_added) change_ui_pos();
    }
    if (
      is_pointer_locked &&
      keyPressed["s"] &&
      !isColliding_back &&
      !hotspot_view
    ) {
      player_obj.position.x -=
        Math.sin(-yawObj.rotation.y) * player.speed * delta;
      player_obj.position.z -=
        -Math.cos(-yawObj.rotation.y) * player.speed * delta;
      if (ui_added) change_ui_pos();
    }
    if (
      is_pointer_locked &&
      keyPressed["a"] &&
      !isColliding_left &&
      !hotspot_view
    ) {
      player_obj.position.x -=
        Math.sin(-yawObj.rotation.y + Math.PI / 2) * player.speed * delta;
      player_obj.position.z -=
        -Math.cos(-yawObj.rotation.y + Math.PI / 2) * player.speed * delta;
      if (ui_added) change_ui_pos();
    }
    if (
      is_pointer_locked &&
      keyPressed["d"] &&
      !isColliding_right &&
      !hotspot_view
    ) {
      player_obj.position.x -=
        Math.sin(-yawObj.rotation.y - Math.PI / 2) * player.speed * delta;
      player_obj.position.z -=
        -Math.cos(-yawObj.rotation.y - Math.PI / 2) * player.speed * delta;
      if (ui_added) change_ui_pos();
    }
    if (keyPressed["q"]) {
      player_obj.position.y += player.speed * 0.6;
    }
    if (keyPressed["e"]) {
      player_obj.position.y -= player.speed * 0.6;
    }
  }

  function update() {
    const raycast_origin = player_obj.position; //raycast origin

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
    const intersects_right =
      raycast_right.intersectObjects(collider_mesh_array);
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
      player_obj.position.y = intersects_down[0].point.y + height_raycast_dist;
    } else if (
      intersects_down.length > 0 &&
      intersects_down[0].distance > height_raycast_dist + 0.1
    ) {
      player_obj.position.y -=
        (intersects_down[0].distance - height_raycast_dist) * player.gravity;
    }
  }

  function look_around(e){
    if (!hotspot_view) {
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
    }
  }

  // Camera look around mechanic
  addEventListener("mousemove", look_around);

  function crosshair_logic() {
    crosshair_raycast.set(
      camera.getWorldPosition(new THREE.Vector3()),
      camera.getWorldDirection(new THREE.Vector3())
    );

    crosshair_intersects =
      crosshair_raycast.intersectObjects(interactable_objects);

    if (
      crosshair_intersects.length > 0 &&
      !object_selected &&
      !object_clicked &&
      !hotspot_view
    ) {
      prev_selected = crosshair_intersects[0];
      // crosshair_intersects[0].object.material.color.set(0xff00000);
      const selectedObject = prev_selected.object;
      const size = new THREE.Box3()
        .setFromObject(selectedObject)
        .getSize(new THREE.Vector3());
      addSelectedObject(selectedObject);
      outlinePass.selectedObjects = selectedObjects;
      gsap.to(crosshair_intersects[0].object.scale, {
        x: 1.1,
        y: 1.1,
        z: 1.1,
        duration: 1,
      });
      data = jsonData[crosshair_intersects[0].object.name];
      hover_card.classList.remove("hide");
      hover_card.classList.add("show");
      const hover_obj = crosshair_intersects[0].object;
      const pos = hover_obj.getWorldPosition(new THREE.Vector3());
      hover_name.textContent = data.name;
      hover_card_container.position.set(
        pos.x,
        player_obj.position.y - 1,
        pos.z
      );
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

        hover_card.classList.remove("show");
        hover_card.classList.add("hide");
      }
    }
  }

  function close_ui() {
    object_clicked = false;
    ui_added = false;
    ui_object = false;

    right_details_container.classList.remove("show");
    right_details_container.classList.add("hide");

    left_details_container.classList.remove("show");
    left_details_container.classList.add("hide");
  }

  function closing_ui(e){
    if (e.key.toLowerCase() == "x") {
      close_ui();
    }
  }

  addEventListener("keyup",closing_ui);

  let scene_2 = null;

  class new_scene {
    constructor(obj) {
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.obj = obj.clone();

      this.height = space_3d.clientHeight;
      this.width = space_3d.clientWidth;

      this.size = 5;
      const scene_ = this.scene;
      this.test = new THREE.Mesh(
        new THREE.BoxGeometry(this.size, this.size, this.size),
        new THREE.MeshBasicMaterial()
      );
      new RGBELoader().load(
        "assets/museum_of_ethnography_2k.hdr",
        function (hdri) {
          hdri.mapping = THREE.EquirectangularReflectionMapping;
          scene_.environment = hdri;
        }
      );
      // this.scene.add(this.test)

      this.camera = new THREE.PerspectiveCamera(
        45,
        this.width / this.height,
        0.1,
        10000
      );
      this.initiate();
    }

    initiate() {
      const renderEl_2 = this.renderer.domElement;
      this.renderer.setSize(this.width, this.height);
      space_3d.appendChild(renderEl_2);
      this.controls = new OrbitControls(this.camera, renderEl_2);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05
      this.obj.position.set(0, 0, 0);
      this.obj.rotation.set(-Math.PI / 2, Math.PI, Math.PI / 5);
      this.scene.add(this.obj);
      const size = new THREE.Box3()
        .setFromObject(this.obj)
        .getSize(new THREE.Vector3());
      console.log(size);
      this.camera.position.set(0, size.y - 100, size.z + 300);
      this.camera.lookAt(this.obj.position);
      this.controls.target = this.obj.position;

      const ambient = new THREE.AmbientLight(0xffffff, 2);
      this.scene.add(ambient);

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    destroy() {
      space_3d.removeChild(this.renderer.domElement);
      this.renderer.dispose();
      this.camera = null;
      this.scene = null;
      this.renderer = null;
      object_selected = false;
    }
  }

  function destroy_scene(){
    scene_2.destroy();
    scene_2 = null;
    container.style.display = "none";
    lock_pointer();
  }

  close_btn.addEventListener("click", destroy_scene);

  function animation() {
    scene_2.renderer.render(scene_2.scene, scene_2.camera);
    scene_2.controls.update()
    if (scene_2 == null) cancelAnimationFrame();
    else requestAnimationFrame(animation);
  }

  function open_detailed_popup(){
    close_ui();

    crosshair_intersects =
      crosshair_raycast.intersectObjects(interactable_objects);
    if (crosshair_intersects.length > 0 && !object_selected) {
      const obj = crosshair_intersects[0].object;
      console.log(obj);
      container.style.display = "flex";
      scene_2 = new new_scene(obj);
      document.exitPointerLock();
      object_selected = true;
      animation();

      console.log(player_obj.position);
      let pos = obj.getWorldPosition(new THREE.Vector3());
      console.log(pos);
      console.log(player_obj.position);
    }
  }

  addEventListener("dblclick", open_detailed_popup);

  function popup_ui(){
    if (is_pointer_locked) handleObjectClick();
  }
  addEventListener("mouseup", popup_ui);

  addEventListener("keyup", (e) => {
    if (e.key == "x" && scene_2 != null) {
      destroy_scene()
    }
  });

  function addSelectedObject(object) {
    selectedObjects = [];
    selectedObjects.push(object);
  }

  function animation__() {
    composer.render();
    labelRenderer.render(scene, camera);
    requestAnimationFrame(animation__);
    if (loaded) update(); //checks collision
    crosshair_logic();
    delta = clock.getDelta();
    player_movement(); //player player_movement
    stats.update();
    if (!hotspot_view) {
      cancelAnimationFrame(animation__);
    }
  }
  animation__();
}

function toggle_mode(e){
  if (e.key.toLowerCase() == "t") {
    hotspot_view = hotspot_view ? false : true;
    if (hotspot_view) {
      renderPass.camera = hotspot_cam;
      hotspot_cam_view();
    } else {
      renderPass.camera = camera;
      player_cam();
    }
  }
}

addEventListener("keyup", toggle_mode);

player_cam();

// animate
function animate() {
  controls.update();
  composer.render();
  if (hotspot_view) labelRenderer.render(scene, hotspot_cam);
  else labelRenderer.render(scene, camera);
  requestAnimationFrame(animate);
  stats.update();
  TWEEN.update();
}
animate();
