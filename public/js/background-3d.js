import addWindowResizeCallback from './windowresize.js';
import { EffectComposer } from './lib/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from './lib/three/examples/jsm/postprocessing/BokehPass.js';
import { SVGLoader } from './lib/three/examples/jsm/loaders/SVGLoader.js';
import { OrbitControls } from './lib/three/examples/jsm/controls/OrbitControls.js';
import { GUI } from './lib/three/examples/jsm/libs/dat.gui.module.js';
import {
  AmbientLight,
  AxesHelper,
  CameraHelper,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Fog,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  PCFSoftShadowMap,
  PointLight,
  Scene,
  Shape,
  ShapeBufferGeometry,
  SpotLight,
  VSMShadowMap,
  WebGLRenderer,
} from './lib/three/build/three.module.js';

let camera, canvasRect, orbitControls, renderer, rootEl, scene;
let mouseX, mouseY;

const layers = [];
var postprocessing = {};

export default function setup() {
  createWorld();
  // initPostprocessing();
  // initGUI();
  addEventListeners();
  onWindowResize();
  populate();
  render();
}
  
/**
 * Add event listeners.
 */
function addEventListeners() {
  document.addEventListener('mousemove', onDocumentMouseMove, false);
  addWindowResizeCallback(onWindowResize);
}

function createTestMesh() {
  let size = 0.4;
  const innerShape = new Shape();
  innerShape.moveTo(-size, -size);
  innerShape.lineTo(size, -size);
  innerShape.lineTo(size, size);
  innerShape.lineTo(-size, size);
  innerShape.lineTo(-size, -size);

  size = 1;
  const rectShape = new Shape();
  rectShape.moveTo(-size, -size);
  rectShape.lineTo(size, -size);
  rectShape.lineTo(size, size);
  rectShape.lineTo(-size, size);
  rectShape.lineTo(-size, -size);
  rectShape.holes.push(innerShape);

  const extrusionSettings = { bevelEnabled: false, depth: 0.01, };
  const geometry = new ExtrudeGeometry(rectShape, extrusionSettings);
  // const material = new MeshPhongMaterial({ color: 0x004400, });
  // const material = new MeshBasicMaterial({ color: 0xffff99, wireframe: true, });
  const material = new MeshPhongMaterial({
    color: 0x999999,
    shininess: 0,
    specular: 0x222222,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Set up 3D world.
 */
function createWorld() {
  renderer = new WebGLRenderer({antialias: true});
  renderer.setClearColor(0x001100);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap; // PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.autoClear = false;

  rootEl = document.querySelector('#background-3d');
  rootEl.appendChild(renderer.domElement);

  canvasRect = renderer.domElement.getBoundingClientRect();

  // SCENE
  scene = new Scene();
  scene.fog = new Fog(0xCCCCCC, 50, 100);

  // CAMERA
  camera = new PerspectiveCamera();
  camera.fov = 45;
  camera.aspect = 1;
  camera.near = 1;
  camera.far = 100;
  camera.position.set(0, 0, -1.5);
  camera.lookAt(0, 0, 0);
  camera.name = 'camera';
  scene.add(camera);

  // AMBIENTLIGHT
  // const ambientLight = new AmbientLight(0x444444);
  // scene.add(ambientLight);

  // const directionalLight = new DirectionalLight(0xffffff, 0.5);
  // directionalLight.position.set(-0.5, 0.5, -1.5).normalize();
  // scene.add(directionalLight);

  // POINTLIGHT
  // const pointLight = new PointLight(0xffffff, 0.8, 10);
  // pointLight.position.set(0, 0, -10);
  // pointLight.castShadow = true;
  // scene.add(pointLight);

  // const cameraHelper = new CameraHelper(pointLight.shadow.camera);
  // scene.add(cameraHelper);

  // SPOTLIGHT
  const spotLight = new SpotLight(0xffffff);
  spotLight.position.set(0, 0, -10);
  spotLight.name = 'spotlight';
  spotLight.angle = Math.PI / 5;
  spotLight.penumbra = 0.3;
  spotLight.castShadow = true;
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 20;
  spotLight.shadow.mapSize.width = 128;
  spotLight.shadow.mapSize.height = 128;
  // spotLight.shadow.bias = -0.002;
  // spotLight.shadow.radius = 4;
  scene.add(spotLight);
        
  // const spotLight = new SpotLight(0xffffff);
  // spotLight.position.set(0, 0, -1.5);
  // spotLight.intensity = 1;
  // spotLight.distance = 100; // default: 0 (no limit)
  // spotLight.angle = Math.PI / 3;
  // spotLight.penumbra = 0; // default 0, range 0 - 1
  // spotLight.decay = 1; // default 1
  // spotLight.castShadow = true;
  // spotLight.shadow.mapSize.width = 4096; // default 512
  // spotLight.shadow.mapSize.height = 4096; // default 512
  // spotLight.shadow.camera.near = 0.5;
  // spotLight.shadow.camera.far = 500;
  // spotLight.shadow.radius = 8;
  // scene.add(spotLight);

  const spotLightCameraHelper = new CameraHelper(spotLight.shadow.camera);
  scene.add(spotLightCameraHelper);

  // GRID
  const grid = new GridHelper(20, 20, 0xcccccc, 0xcccccc);
  grid.position.set(0, 0, 0);
  scene.add(grid);
  
  // AXES
  const axesHelper = new AxesHelper(10);
  scene.add(axesHelper);
  
  // ORBIT CONTROL
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.update();
}

function initGUI() {
  var effectController = {
    focus: 500.0,
    aperture:	5,
    maxblur:	1.0,
  };

  var matChanger = function () {
    postprocessing.bokeh.uniforms['focus'].value = effectController.focus;
    postprocessing.bokeh.uniforms['aperture'].value = effectController.aperture * 0.00001;
    postprocessing.bokeh.uniforms['maxblur'].value = effectController.maxblur;
  };

  // GUI
  var gui = new GUI();
  gui.add(effectController, "focus", 10.0, 3000.0, 10 ).onChange(matChanger);
  gui.add(effectController, "aperture", 0, 10, 0.1 ).onChange( matChanger );
  gui.add(effectController, "maxblur", 0.0, 3.0, 0.025 ).onChange( matChanger );
  gui.close();

  matChanger();
}

function initPostprocessing() {
  const renderPass = new RenderPass(scene, camera);

  const bokehPass = new BokehPass(scene, camera, {
    focus: 500.0,
    aperture:	0.025,
    maxblur:	1.0,
    width: canvasRect.width,
    height: canvasRect.height,
  } );

  const composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bokehPass);

  postprocessing.composer = composer;
  postprocessing.bokeh = bokehPass;
  console.log(postprocessing);
}

function loadSVG() {
  const width = 10;
  const height = 10;

  const rectShape = new Shape();
  rectShape.lineTo(width, 0);
  rectShape.lineTo(width, height);
  rectShape.lineTo(0, height);
  rectShape.lineTo(0, 0);

  const extrusionSettings = { bevelEnabled: false, depth: 0.1, };
  const geometry = new ExtrudeGeometry( rectShape, extrusionSettings );
  const mesh = new Mesh(geometry, new MeshPhongMaterial());
  scene.add(mesh);

  
  const loader = new SVGLoader();
  loader.load(
    'images/star6.svg',
    data => {
      data.paths.forEach(path => {
        const shapes = path.toShapes(true);
        shapes.forEach(shape => {
          rectShape.holes.push(shape);
        });
      });
      const extrusionSettings = { bevelEnabled: false, depth: 0.1, };
      const geometry = new ExtrudeGeometry( rectShape, extrusionSettings );
      const mesh = new Mesh(geometry, new MeshPhongMaterial());
      scene.add(mesh);
    }
  );
}

function onDocumentMouseMove(e) {
  mouseX = event.clientX - (canvasRect.width / 2);
	mouseY = event.clientY - (canvasRect.height / 2);
}

/**
 * Window resize event handler.
 */
function onWindowResize() {
  canvasRect = renderer.domElement.getBoundingClientRect();
  renderer.setSize(window.innerWidth, window.innerHeight - canvasRect.top);
  camera.aspect = window.innerWidth / (window.innerHeight - canvasRect.top);
  camera.updateProjectionMatrix();
  canvasRect = renderer.domElement.getBoundingClientRect();

  // move camera further back when viewport height increases so objects stay the same size 
  let scale = 0.01; // 0.15;
  let fieldOfView = camera.fov * (Math.PI / 180); // convert fov to radians
  let targetZ = canvasRect.height / (2 * Math.tan(fieldOfView / 2));

  orbitControls.saveState();

  // postprocessing.composer.setSize(canvasRect.width, canvasRect.height);
}

/**
 * Populate the world.
 */
function populate() {
  const mesh = createTestMesh();
  layers.push(mesh);
  scene.add(mesh);

  for (let i = 0; i < 4; i++) {
    const clone = mesh.clone();
    clone.translateZ(i * 0.5);
    layers.push(clone);
    scene.add(clone);
  }
}

/**
 * Update the physics world and render the results in 3D.
 */
function render() {
  if (mouseX && mouseY) {
    layers.forEach((layer, i) => {
      layer.position.set(mouseX / 1000, mouseY / 1000, layer.position.z);
    });
  }
  renderer.render(scene, camera);
  // postprocessing.composer.render( 0.1 );
  requestAnimationFrame(render);
}
