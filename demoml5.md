# Referencia funcional para integrar ml5.js BodyPose en Dimensiones Jamboteo

## Objetivo

Usar este documento como referencia técnica para corregir la integración de `ml5.js BodyPose` dentro del proyecto **Dimensiones Jamboteo**.

La versión actual de la app ya tiene una estética visual buena.  
Lo que falta es que la cámara y el tracking corporal funcionen correctamente.

**Importante:**  
No copiar el estilo visual exacto de este ejemplo.  
Usar únicamente la lógica técnica para:

- cargar `ml5.js`
- inicializar `bodyPose`
- capturar video con webcam
- iniciar detección con `detectStart`
- recibir poses en `gotPoses`
- obtener conexiones del skeleton con `getSkeleton`
- leer keypoints confiables
- convertir esos keypoints en visuales propios del proyecto

La estética final debe seguir siendo la de **Dimensiones Jamboteo**: instalación oscura, elegante, dimensional, tipo portal/mapping, con audiencia bailando como imagen principal.

---

## Referencia HTML funcional

Este ejemplo funciona en CodePen usando p5.js + ml5.js.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ml5.js bodyPose Skeleton Example</title>
  </head>
  <body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
    <script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
  </body>
</html>
```

---

## Referencia JavaScript funcional

```js
let video;
let bodyPose;
let poses = [];
let connections;
let particles = [];
let trailColors = [];
let lastPose = null;

// Particle class for creating trailing effects
class Particle {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.lifespan = 255;
    this.color = color;
    this.size = random(4, 12);
  }

  update() {
    this.lifespan -= 2;
    this.size *= 0.97;
  }

  display() {
    noStroke();
    let c = color(this.color);
    c.setAlpha(this.lifespan);
    fill(c);
    circle(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  createCanvas(900, 780);
  video = createCapture(VIDEO);
  video.size(900, 780);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
  connections = bodyPose.getSkeleton();

  // Generate a beautiful color palette for trails
  trailColors = [
    color(255, 102, 179, 150), // pink
    color(102, 178, 255, 150), // blue
    color(255, 178, 102, 150), // orange
    color(178, 255, 102, 150), // lime
    color(178, 102, 255, 150)  // purple
  ];

  background(0);
}

function draw() {
  // Create a semi-transparent background for fade effect
  background(0, 20);

  // Update and display particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // Draw pose-based art
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];

    // Create flowing patterns between key points
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];

      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        // Create particles along the connection lines
        let steps = 5;
        for (let t = 0; t <= steps; t++) {
          let x = lerp(pointA.x, pointB.x, t/steps);
          let y = lerp(pointA.y, pointB.y, t/steps);
          let colorIndex = (j + frameCount/30) % trailColors.length;
          particles.push(new Particle(x, y, trailColors[floor(colorIndex)]));
        }
      }
    }

    // Special effects for specific poses
    let leftWrist = pose.keypoints[9];
    let rightWrist = pose.keypoints[10];
    let leftAnkle = pose.keypoints[15];
    let rightAnkle = pose.keypoints[16];

    // Create spiral patterns when hands are raised
    if (leftWrist.confidence > 0.1 && leftWrist.y < pose.keypoints[5].y) {
      createSpiral(leftWrist.x, leftWrist.y, frameCount/10);
    }
    if (rightWrist.confidence > 0.1 && rightWrist.y < pose.keypoints[6].y) {
      createSpiral(rightWrist.x, rightWrist.y, -frameCount/10);
    }

    // Create ground effects when feet move
    if (leftAnkle.confidence > 0.1 || rightAnkle.confidence > 0.1) {
      let y = max(leftAnkle.y, rightAnkle.y);
      createGroundEffect(y);
    }
  }

  // Optional: Draw a subtle version of the video feed
  tint(255, 30);
  image(video, 0, 0, width, height);
  noTint();
}

function createSpiral(x, y, angle) {
  let radius = 20;
  let spiralX = x + cos(angle) * radius;
  let spiralY = y + sin(angle) * radius;
  particles.push(new Particle(spiralX, spiralY, trailColors[frameCount % trailColors.length]));
}

function createGroundEffect(y) {
  for (let i = 0; i < 5; i++) {
    let x = random(width);
    let particleY = y + random(-10, 10);
    particles.push(new Particle(x, particleY, trailColors[4]));
  }
}

function gotPoses(results) {
  poses = results;
}
```

---

## Puntos técnicos que sí deben conservarse

### 1. Carga correcta de librerías

El ejemplo usa estas versiones:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

En Next.js, estas librerías deben cargarse solo del lado del cliente.  
No deben ejecutarse durante SSR.

Opciones aceptables:

- Usar un componente con `"use client"`.
- Cargar los scripts con `next/script`.
- Inicializar la lógica únicamente después de que `window`, `p5` y `ml5` existan.
- Alternativamente, crear un componente `BodyPoseSketch.tsx` que monte un sketch de p5 en un `div`.

---

### 2. Inicialización correcta de BodyPose

La lógica importante es:

```js
function preload() {
  bodyPose = ml5.bodyPose();
}
```

y después:

```js
bodyPose.detectStart(video, gotPoses);
connections = bodyPose.getSkeleton();
```

Esto es clave.

No reemplazarlo por APIs viejas como `poseNet`, ni asumir sintaxis de ml5 v0.x.

Este proyecto usa:

```js
ml5.bodyPose()
```

de ml5 v1.

---

### 3. Captura correcta de video

La cámara se inicializa así:

```js
video = createCapture(VIDEO);
video.size(900, 780);
video.hide();
```

En Next.js, el canvas debe recibir el video de forma equivalente.

El video no necesita verse tal cual en pantalla.  
Puede estar oculto y usarse solo como input para BodyPose.

---

### 4. Callback de poses

La función mínima es:

```js
function gotPoses(results) {
  poses = results;
}
```

El sistema de dibujo debe leer `poses`.

Cada `pose` contiene:

```js
pose.keypoints
```

Cada keypoint suele tener:

```js
x
y
confidence
```

Solo usar keypoints con confianza suficiente:

```js
if (point.confidence > 0.1) {
  // draw / generate effects
}
```

---

### 5. Skeleton connections

El ejemplo usa:

```js
connections = bodyPose.getSkeleton();
```

Luego recorre conexiones:

```js
for (let j = 0; j < connections.length; j++) {
  let pointAIndex = connections[j][0];
  let pointBIndex = connections[j][1];

  let pointA = pose.keypoints[pointAIndex];
  let pointB = pose.keypoints[pointBIndex];

  if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
    // draw connection or generate particles
  }
}
```

Esta parte sí debe conservarse conceptualmente.

---

## Índices útiles de keypoints

El ejemplo usa estos índices:

```js
leftWrist = pose.keypoints[9]
rightWrist = pose.keypoints[10]
leftAnkle = pose.keypoints[15]
rightAnkle = pose.keypoints[16]
```

También son útiles:

```js
leftShoulder = pose.keypoints[5]
rightShoulder = pose.keypoints[6]
leftHip = pose.keypoints[11]
rightHip = pose.keypoints[12]
```

Usos creativos sugeridos:

- Manos arriba → abrir portal / espirales / ondas.
- Manos separadas → expandir campo energético.
- Torso → centro gravitacional del portal.
- Pies → pulsos de suelo.
- Movimiento rápido → glitch / eco / trails.
- Varias personas → múltiples portales.

---

## Adaptación esperada a Dimensiones Jamboteo

No copiar exactamente:

- colores del ejemplo
- partículas circulares simples
- estilo de trails actual
- proporción fija 900x780

Sí usar:

- la lógica de `bodyPose`
- la lógica de `detectStart`
- la lógica de `getSkeleton`
- el filtrado por `confidence`
- keypoints para generar visuales
- fallback si no hay poses

La estética debe integrarse al proyecto existente.

---

## Dirección visual deseada

El resultado final debe sentirse como:

- una pieza instalada
- una audiencia convertida en portal
- cuerpos como constelaciones
- skeleton distorsionado, no literal
- trazos grandes y visibles para proyector poco luminoso
- negro profundo
- alto contraste
- formas orgánicas, rituales, dimensionales
- mapping con frames pequeños alrededor

La audiencia debe ser la imagen principal.  
Las obras de CodePen deben funcionar como dimensiones secundarias en pequeños marcos flotantes.

---

## Recomendaciones para Next.js

Crear un componente cliente:

```tsx
"use client";

export default function BodyPosePortal() {
  return <div id="bodypose-container" className="w-full h-full" />;
}
```

Dentro de `useEffect`:

1. Cargar o validar `window.p5`.
2. Cargar o validar `window.ml5`.
3. Crear instancia de p5.
4. En `preload`, inicializar `bodyPose = ml5.bodyPose()`.
5. En `setup`, crear canvas responsive.
6. Crear capture de video.
7. Ejecutar `bodyPose.detectStart(video, gotPoses)`.
8. Obtener `connections = bodyPose.getSkeleton()`.
9. En `draw`, usar poses para dibujar el portal.

Importante:

- Destruir el sketch al desmontar componente.
- Detener cámara si es posible.
- Evitar crear múltiples instancias de p5 al cambiar de fase.
- No correr en SSR.
- Usar `typeof window !== "undefined"`.

---

## Fallback obligatorio

Si la cámara falla o ml5 no carga:

- mostrar un portal simulado
- usar movimiento procedural
- no dejar pantalla vacía

Esto es importante porque será una instalación en vivo.

---

## Prompt directo para corregir la implementación

Usa esta referencia para corregir la integración de `ml5.js BodyPose` en el proyecto actual.

La versión visual actual está bien encaminada.  
No cambies toda la estética.  
Corrige específicamente la parte de cámara/body tracking usando la lógica funcional de este CodePen.

Implementa un componente estable de BodyPose que:

- cargue p5.js y ml5.js correctamente del lado cliente
- use `ml5.bodyPose()` de ml5 v1
- use `bodyPose.detectStart(video, gotPoses)`
- use `bodyPose.getSkeleton()`
- capture webcam
- reciba poses en tiempo real
- dibuje keypoints/connections como base
- transforme el cuerpo en un portal visual coherente con Dimensiones Jamboteo
- tenga fallback visual si no hay cámara o no hay poses
- no copie el estilo exacto del ejemplo
- mantenga el look de instalación/mapping ya logrado

Prioridad:
1. Que la cámara funcione.
2. Que BodyPose detecte personas.
3. Que los keypoints y skeleton se dibujen correctamente.
4. Que el estilo visual se integre a la pieza.
5. Que sea estable para presentación en vivo.

No sobreingenierizar.  
Necesito una solución funcional y presentable para correr localmente hoy.
