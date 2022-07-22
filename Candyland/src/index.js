import { 
  sRGBEncoding, Color, CylinderGeometry, DoubleSide, BoxGeometry, Mesh, PointLight, MeshPhysicalMaterial, PerspectiveCamera,
  Scene, PMREMGenerator, PCFSoftShadowMap, AnimationMixer, Vector2, TextureLoader, SphereGeometry
} from 'https://cdn.skypack.dev/three@0.137';
import { OrbitControls } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
import { RGBELoader } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise';

document.addEventListener("DOMContentLoaded", Start);
//cena
var scene = new Scene();
//fundo
scene.background = new TextureLoader().load("assets/cloudFundo.jpg");

//camera perspetiva
var camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 18, 40);

//renderizar com o tamanho da tela, corrigir luz e sombras
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

//texto com as instruções e os seus parâmetros
var texto = document.createElement('div');
texto.style.position = 'absolute';
texto.style.width = 100;
texto.style.height = 100;
texto.innerHTML = "<b>Controlos:</b><br>●Mover Câmera: Rato Botão Esquerdo<br>●Arrastar Câmera: Rato Botão Direito<br>●Zoom: Rato Scroll<br>"+
"●On/Off Animação Baú: SPACE<br>●On/Off Luz Candeeiros: L<br>"+
"●On/Off Luz Ambiente: K<br>●Câmera Perspetiva: P<br>●Câmera Ortogonal: O<br>●Baixo/Cima Avião: Q/E<br>●Frente/Trás Avião: W/S<br>"+
"●Esquerda/Direita Avião: A/D";
texto.style.top = 30 + 'px';
texto.style.left = 20 + 'px';
document.body.appendChild(texto);

//controlar camera com o rato
var controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
//controlar velocidade ao mexer
controls.dampingFactor = 0.1;
controls.enableDamping = true;

//textura mapa
let pmrem = new PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

let envmap;

const MAX_HEIGHT = 5;

//objetos com o seu material e forma geométrica
var geometria = new THREE.BoxGeometry(0.00001,0.00001,0.00001);
var material = new THREE.MeshStandardMaterial({color: 0xff0000});
var cubo = new THREE.Mesh(geometria, material);
var cuboAviao = new THREE.Mesh(geometria, material);

//luz ambiente
let backlight = new THREE.AmbientLight(0Xfff2d9, 2);
scene.add(backlight);

//luz pointlight com os seus parâmetros
let light1 = new PointLight( new Color("#ffb073").convertSRGBToLinear(), 30, 3 );
let light2 = new PointLight( new Color("#fc9fe5").convertSRGBToLinear(), 30, 3 );
let light3 = new PointLight( new Color("#ffb073").convertSRGBToLinear(), 30, 3 );

(async function() {
  let envmapTexture = await new RGBELoader().loadAsync("assets/envmap.hdr");
  let rt = pmrem.fromEquirectangular(envmapTexture);
  envmap = rt.texture;

  //carregar texturas para o mapa e pedras do chão
  let textures = {
    dirt: await new TextureLoader().loadAsync("assets/dirt.png"),
    dirt2: await new TextureLoader().loadAsync("assets/dirt2.jpg"),
    grass: await new TextureLoader().loadAsync("assets/grass.png"),
    sand: await new TextureLoader().loadAsync("assets/sand.jpg"),
    stone: await new TextureLoader().loadAsync("assets/stone.jpg"),
    chao1: await new TextureLoader().loadAsync("assets/chao1.jpg"),
    chao2: await new TextureLoader().loadAsync("assets/chao2.jpg"),
    chao3: await new TextureLoader().loadAsync("assets/chao3.jpg"),
    chao4: await new TextureLoader().loadAsync("assets/chao4.jpg"),
  };

  const simplex = new SimplexNoise(); 

  //definir altura dos objetos de fundo do mapa. Nas bordas é maior e vai diminuindo para o centro
  for(let i = -36; i <= 36; i++) {
    for(let j = -36; j <= 36; j++) {
      let position = tileToPosition(i, j);

      if(position.length() > 32) continue;
      
      let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5;
      noise = Math.pow(noise, 1.1);

      if(position.length() > 22 && position.length() < 28)
      {
        hex(noise * 2, position, envmap);
      }
      else if (position.length() > 28 && position.length() < 32)
      {
        hex(noise * MAX_HEIGHT, position, envmap);
      }
      else {hex(noise, position, envmap); }
      
    } 
  }

  //definir mesh das texturas
  let stoneMesh = hexMesh(stoneGeo, textures.stone);
  let grassMesh = hexMesh(grassGeo, textures.grass);
  let dirt2Mesh = hexMesh(dirt2Geo, textures.dirt2);
  let dirtMesh  = hexMesh(dirtGeo, textures.dirt);
  let sandMesh  = hexMesh(sandGeo, textures.sand);
  scene.add(stoneMesh, dirtMesh, dirt2Mesh, sandMesh, grassMesh);

  //adicionar o fundo e borda do mapa com as suas texturas e parâmetros
  let mapContainer = new Mesh(
    new CylinderGeometry(33.1, 33.1, MAX_HEIGHT * 0.25, 50, 1, true),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt,
      side: DoubleSide,
    })
  );
  mapContainer.receiveShadow = true;
  mapContainer.rotation.y = -Math.PI * 0.333 * 0.5;
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
  scene.add(mapContainer);

  let mapFloor = new Mesh(
    new CylinderGeometry(34.5, 34.5, MAX_HEIGHT * 0.1, 50),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt2,
      side: DoubleSide,
    })
  );
  mapFloor.receiveShadow = true;
  mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
  scene.add(mapFloor);

  //função das nuvens e função com os objetos FBX
  clouds();
  fbx();

  //adicionar pedras do caminho no chão com as texturas, formas geométricas e posições no mapa
  for(let i = 0; i<= 24; i +=12)
  {
    var geoChao = new THREE.CylinderGeometry(0.8, 0.8, 0.4, 8, 1, false);
    //material recebe luz
    var material = new MeshPhysicalMaterial({ map: textures.chao1,});
    var chao = new THREE.Mesh(geoChao, material);
    chao.position.x = 5 - i;
    chao.position.y = 0.6;
    chao.position.z = -1;
    scene.add(chao);
    
    var material2 = new MeshPhysicalMaterial({ map: textures.chao2,});
    var chao2 = new THREE.Mesh(geoChao, material2);
    chao2.position.x = 2 - i;
    chao2.position.y = 0.6;
    chao2.position.z = -2;
    scene.add(chao2);
    
    var material3 = new MeshPhysicalMaterial({ map: textures.chao3,});
    var chao3 = new THREE.Mesh(geoChao, material3);
    chao3.position.x = -1 - i;
    chao3.position.y = 0.6;
    chao3.position.z = -1;
    scene.add(chao3);
    
    var material4 = new MeshPhysicalMaterial({ map: textures.chao4,});
    var chao4 = new THREE.Mesh(geoChao, material4);
    chao4.position.x = -4 - i;
    chao4.position.y = 0.6;
    chao4.position.z = 0;
    if( chao4.position.x > -24)
      scene.add(chao4);
  }
  
//update do mapa e animação
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  
})();

//função para colocar objeto do chão/fundo na posição
function tileToPosition(tileX, tileY) {
  return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
}

//objeto com forma geométrica para o chão/fundo do mapa e a sua posição
function hexGeometry(height, position) {
  let geo  = new CylinderGeometry(1, 1, height, 8, 1, false);
  
  geo.translate(position.x, height * 0.5, position.y);

  return geo;
}

//tamanho dos objetos do chão/fundo
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.6;
const GRASS_HEIGHT = MAX_HEIGHT * 0.3;
const SAND_HEIGHT = MAX_HEIGHT * 0.15;
const DIRT2_HEIGHT = MAX_HEIGHT * 0;

let stoneGeo = new BoxGeometry(0,0,0);
let dirtGeo = new BoxGeometry(0,0,0);
let dirt2Geo = new BoxGeometry(0,0,0);
let sandGeo = new BoxGeometry(0,0,0);
let grassGeo = new BoxGeometry(0,0,0);

//colocar os objetos no chão fundo, dependendo da sua altura
function hex(height, position) {
  let geo = hexGeometry(height, position);

  if(height > STONE_HEIGHT) {
    stoneGeo = mergeBufferGeometries([geo, stoneGeo]);

    if(Math.random() > 0.8) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }
  } else if(height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([geo, dirtGeo]);

  } else if(height > GRASS_HEIGHT) {
    grassGeo = mergeBufferGeometries([geo, grassGeo]);
  } else if(height > SAND_HEIGHT) { 
    sandGeo = mergeBufferGeometries([geo, sandGeo]);

    if(Math.random() > 0.8 && stoneGeo) {
      stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
    }
  } else if(height > DIRT2_HEIGHT) {
    dirt2Geo = mergeBufferGeometries([geo, dirt2Geo]);
  } 
}

//parâmetros para o fundo
function hexMesh(geo, map) {
  let mat = new MeshPhysicalMaterial({ 
    envMap: envmap, 
    flatShading: true,
    map
  });

  let mesh = new Mesh(geo, mat);
  mesh.castShadow = true; //default é falso

  return mesh;
}

//adicionar as pedras redondas no chão na posição
function stone(height, position) {
  const px = 0.4;
  const pz = 0.4;

  const geo = new SphereGeometry(0.3 + 0.1, 7, 7);
  geo.translate(position.x + px, height, position.y + pz);

  return geo;
}

//função para criar as nuvens
async function clouds() {
  let geo = new SphereGeometry(0, 0, 0); 
  let count = 12; //número de nuvens

  for(let i = 0; i < count; i++) {
    //uma nuvem é constituída por 3 esferas
    const puff1 = new SphereGeometry(1.2, 7, 7);
    const puff2 = new SphereGeometry(1.5, 7, 7);
    const puff3 = new SphereGeometry(0.9, 7, 7);
   
    puff1.translate(-1.85, 0.2, 0);
    puff2.translate(0, 0.2, 0);
    puff3.translate(1.85, 0.2, 0);

    //posição das nuvens
    const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
    cloudGeo.translate( 
      Math.random() * 37 - 3, 
      Math.random() * 5 + 13, 
      Math.random() * 37 - 3
    );
    //rodar as nuvens
    cloudGeo.rotateY(Math.random() * Math.PI * 2);

    geo = mergeBufferGeometries([geo, cloudGeo]);
  }
  //adicionar texturas e parâmetros do material das nuvens
  let textures = {
    cloud: await new TextureLoader().loadAsync("assets/cloud.jpg"),
  };
  const mesh = new Mesh(
    geo,
    new MeshPhysicalMaterial({
      //color: 0xffffff,
      envMap: envmap, 
      map: textures.cloud,
      flatShading: true,
    })
  );
  scene.add(mesh);
}

//definir teclas para mover o objeto 'avião' e a sua velocidade
var aviaoAndar = {x:0, y:0, z:0};
var velocidadeAndar = 0.8;
//variáveis flag
var luzAmbiente = 0;
var perspetiva = 0;
var ortogonal = 0;
var luzPoint = 0;
var animBau = 0;

//evento quando tecla é pressionada
document.addEventListener("keydown", ev=>{
  var coords = {x:0, y:0, z:0};

    //tecla W
    if(ev.keyCode == 87)
    coords.z -= velocidadeAndar;
    //tecla S
    if(ev.keyCode == 83)
    coords.z += velocidadeAndar;
    //tecla A
    if(ev.keyCode == 65)
    coords.x -= velocidadeAndar;
    //tecla D
    if(ev.keyCode == 68)
    coords.x += velocidadeAndar;
     //tecla Q
     if(ev.keyCode == 81)
     coords.y -= velocidadeAndar;
     //tecla E
     if(ev.keyCode == 69)
     coords.y += velocidadeAndar;

  aviaoAndar = coords;
  

  //tecla P - perspetiva
  if(ev.keyCode == 80)
    perspetiva = 1;
  //tecla O - ortogonal
  if(ev.keyCode == 79)
    ortogonal = 1;

  //tecla K - Ambiente
  if(ev.keyCode == 75)
    luzAmbiente = 1;

  //tecla Espaço - Animação Baú
  if(ev.keyCode == 32)
    animBau = 1;  

});

//tecla deixa de ser premida
document.addEventListener("keyup", ev=>{
  var coords = {x:0, y:0, z:0};

  //tecla W
  if(ev.keyCode == 87)
    coords.z += velocidadeAndar;
    //tecla S
    if(ev.keyCode == 83)
    coords.z -= velocidadeAndar;
   //tecla A
   if(ev.keyCode == 65)
   coords.x += velocidadeAndar;
   //tecla D
   if(ev.keyCode == 68)
   coords.x -= velocidadeAndar;
    //tecla Q
    if(ev.keyCode == 81)
    coords.y += velocidadeAndar;
    //tecla E
    if(ev.keyCode == 69)
    coords.y -= velocidadeAndar;

  aviaoAndar = coords;

  //tecla P - perspetiva
  if(ev.keyCode == 80)
    perspetiva = 1;
  //tecla O - ortogonal
  if(ev.keyCode == 79)
    ortogonal = 1;

  //tecla K - Ambiente
  if(ev.keyCode == 75)
    luzAmbiente = 1;

  //tecla Espaço - Animação Baú
  if(ev.keyCode == 32)
    animBau = 1; 
});

//controlador de animações do objeto importado
var mixerAnimacaoAviao;
var mixerAnimacaoGumball;
//controla o tempo da aplicação
var relogio = new THREE.Clock();
var relogio2 = new THREE.Clock();

//função para inserir os objetos FBX
function fbx() {
  var importer = new THREE.FBXLoader();
  var importer2 = new THREE.FBXLoader();
  var importer3 = new THREE.FBXLoader();
  var importer4 = new THREE.FBXLoader();
  var importer5 = new THREE.FBXLoader();
  var importer51 = new THREE.FBXLoader();
  var importer52 = new THREE.FBXLoader();
  var importer6 = new THREE.FBXLoader();
  var importer7 = new THREE.FBXLoader();
  var importer8 = new THREE.FBXLoader();

  //avião com animação
  importer.load("./Objetos/CandyCruiser.fbx", function (object){
      //Inicializar var tendo em conta o objeto
      mixerAnimacaoAviao = new AnimationMixer(object);
  
      //criar animação e inicializar
      var action = mixerAnimacaoAviao.clipAction(object.animations[0]);
      action.play();
  
      //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
      object.traverse(function (child){
          if(child.isMesh){
              child.castShadow = true;
              child.receiveShadow = true;
          }
      });
      cuboAviao.add(object);
      //mudar escala do objeto
      object.scale.x = 0.03;
      object.scale.y = 0.03;
      object.scale.z = 0.03;
  
      //posição do objeto
      object.position.x = 0;
      object.position.y = 10;
      object.position.z = 20;

  });

//Casa
importer2.load("./Objetos/CandyHouse.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.006;
  object.scale.y = 0.006;
  object.scale.z = 0.006;

  //posição do objeto
  object.position.x = 13.5;
  object.position.y = 1;
  object.position.z = -2;
});

//gelado
importer3.load("./Objetos/gelado.fbx", function (object){
  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.006;
  object.scale.y = 0.006;
  object.scale.z = 0.006;

  //posição do objeto
  object.position.x = 8;
  object.position.y = 0;
  object.position.z = -23;
});

//máquina chiclas com animação
importer4.load("./Objetos/gumball.fbx", function (object){

  mixerAnimacaoGumball = new AnimationMixer(object);
  
  //criar animação e inicializar
  var action = mixerAnimacaoGumball.clipAction(object.animations[0]);
  action.play();
  
  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.3;
  object.scale.y = 0.3;
  object.scale.z = 0.3;

  //posição do objeto
  object.position.x = -10;
  object.position.y = -8.1;
  object.position.z = -18;

  //rodar objeto
  object.rotation.y = - (Math.PI / 3);
  
});

//candeeiros
importer5.load("./Objetos/LampPost.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.1;
  object.scale.y = 0.1;
  object.scale.z = 0.1;

  //posição do objeto
  object.position.x = 4;
  object.position.y = 2;
  object.position.z = -4;

  //rodar objeto
  object.rotation.y = - Math.PI / 2;

  //luz pointlight com os seus parâmetros
  light1.position.set(4, 2, -2);
  light1.castShadow = true; 
  light1.shadow.mapSize.width = 2; 
  light1.shadow.mapSize.height = 2; 
  light1.shadow.camera.near = 0.5; 
  light1.shadow.camera.far = 2; 
  material.needsUpdate = true;
  scene.add(light1);

//evento quando tecla é pressionada
document.addEventListener("keydown", ev=>{
   //tecla L - Point Light
   if(ev.keyCode == 76)
    luzPoint = 1;
});

//tecla deixa de ser premida
document.addEventListener("keyup", ev=>{
  //tecla L - Point Light
   if(ev.keyCode == 76)
    luzPoint = 0;
});

});

importer51.load("./Objetos/LampPost.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.1;
  object.scale.y = 0.1;
  object.scale.z = 0.1;

  //posição do objeto
  object.position.x = -7;
  object.position.y = 2;
  object.position.z = 3;

  //rodar objeto
  object.rotation.y = Math.PI / 2;

  //luz pointlight com os seus parâmetros
  light2.position.set(-7, 2, 1);
  light2.castShadow = true; 
  light2.shadow.mapSize.width = 2; 
  light2.shadow.mapSize.height = 2; 
  light2.shadow.camera.near = 0.5; 
  light2.shadow.camera.far = 2; 
  scene.add(light2);

  //evento quando tecla é pressionada
document.addEventListener("keydown", ev=>{
  //tecla L - Point Light
  if(ev.keyCode == 76)
   luzPoint = 1;
});

//tecla deixa de ser premida
document.addEventListener("keyup", ev=>{
 //tecla L - Point Light
  if(ev.keyCode == 76)
   luzPoint = 0;
});

});

importer52.load("./Objetos/LampPost.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.1;
  object.scale.y = 0.1;
  object.scale.z = 0.1;

  //posição do objeto
  object.position.x = -18;
  object.position.y = 2;
  object.position.z = -5;

  //rodar objeto
  object.rotation.y = - Math.PI / 2;

  //luz pointlight com os seus parâmetros
  light3.position.set(-18, 2, -3);
  light3.castShadow = true; 
  light3.shadow.mapSize.width = 2; 
  light3.shadow.mapSize.height = 2; 
  light3.shadow.camera.near = 0.5; 
  light3.shadow.camera.far = 2; 
  scene.add(light3);

//evento quando tecla é pressionada
document.addEventListener("keydown", ev=>{
  //tecla L - Point Light
  if(ev.keyCode == 76)
   luzPoint = 1;
});

//tecla deixa de ser premida
document.addEventListener("keyup", ev=>{
 //tecla L - Point Light
  if(ev.keyCode == 76)
   luzPoint = 0;
});

});

//bolo
importer6.load("./Objetos/Cake.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.02;
  object.scale.y = 0.02;
  object.scale.z = 0.02;

  //posição do objeto
  object.position.x = -12;
  object.position.y = 2;
  object.position.z = 19;
});

//baú
importer7.load("./Objetos/chest.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.04;
  object.scale.y = 0.04;
  object.scale.z = 0.04;

  //posição do objeto
  object.position.x = -26;
  object.position.y = 1.2;
  object.position.z = -1;

  //rodar objeto
  object.rotation.y = Math.PI / 2;

  objetoBau = object;
});

//batido
importer8.load("./Objetos/milkshake.fbx", function (object){

  //Ver se filho tem mesh, e se sim, permitir projetar e receber sombras
  object.traverse(function (child){
      if(child.isMesh){
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });
  cubo.add(object);
  //mudar escala do objeto
  object.scale.x = 0.005;
  object.scale.y = 0.005;
  object.scale.z = 0.005;

  //posição do objeto
  object.position.x = -1;
  object.position.y = 3;
  object.position.z = -6;

  //rodar objeto
  object.rotation.z = (Math.PI / 9);
});

}

//variáveis animação baú
var clockBau = new THREE.Clock();
var speedBau = 1;
var delta = 0;
var objetoBau;

function Start(){
  scene.add(cubo);
  scene.add(cuboAviao);
  requestAnimationFrame(update);
}

function update(){
  //Indica tempo que passou desde o último frame renderizado
  if(mixerAnimacaoAviao){
    mixerAnimacaoAviao.update(relogio.getDelta());
  }
  if(mixerAnimacaoGumball){
    mixerAnimacaoGumball.update(relogio2.getDelta());
  }
  
  //mover objeto avião
  //Verifica se está próximo do chão. Se tiver, não desce mais (colisão)
    if(aviaoAndar != null && cuboAviao.position.y > -8)
    {
        cuboAviao.position.x +=aviaoAndar.x;
        cuboAviao.position.y +=aviaoAndar.y;
        cuboAviao.position.z +=aviaoAndar.z;

    } else if(aviaoAndar != null && cuboAviao.position.y < -8)
    {
        cuboAviao.position.y = -7.9;
    }

    //desligar/ligar luz Ambiente
    if(luzAmbiente == 1)
    {
      backlight.visible = false;
      scene.add(backlight);
      material.needsUpdate = true;
    }
    else
    {
      backlight.visible = true;
      scene.add(backlight);
      material.needsUpdate = true;
    }

    //desligar/ligar luz Candeeiros
    if(luzPoint == 1)
    {
      light1.visible = false;
      scene.add(light1);
      light2.visible = false;
      scene.add(light2);
      light3.visible = false;
      scene.add(light3);
      material.needsUpdate = true;
    }
    else
    {
      light1.visible = true;
      scene.add(light1);
      light2.visible = true;
      scene.add(light2);
      light3.visible = true;
      scene.add(light3);
      material.needsUpdate = true;
    }

    //mudar para câmera perspetiva
    if(perspetiva == 1)
    {
      camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
      camera.position.set(0, 18, 40);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0,0,0);
      //controlar velocidade ao mexer
      controls.dampingFactor = 0.1;
      controls.enableDamping = true;
    }
    //mudar para câmera ortogonal
    if(ortogonal == 1)
    {
      camera = new THREE.OrthographicCamera(innerWidth / - 45, innerWidth / 45, innerHeight / 45, innerHeight / - 45, 0.1, 100);
      camera.position.set(0, 18, 40);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0,0,0);
      //controlar velocidade ao mexer
      controls.dampingFactor = 0.1;
      controls.enableDamping = true;
    }

    delta = clockBau.getDelta();

    //desligar/ligar animação baú
    if(animBau == 1)
    {
      if(objetoBau != null)
      {
        objetoBau.rotation.y =  Math.PI / 2;
      }
    }
    else{
      if(objetoBau != null)
      {
        objetoBau.rotation.y += speedBau * delta;
      }
    }

  //reiniciar variáveis
  aviaoAndar = {x:0, y:0,z:0};
  luzAmbiente = 0;
  perspetiva = 0;
  ortogonal = 0;
  animBau = 0;
  
  //Controlar FrameRate
  setTimeout( function() {
    requestAnimationFrame(update);
  }, 1000 / 30 );
    
  renderer.render(scene, camera);
} 



  