Build a Next.js App Router project called “Dimensiones Jamboteo”.

This is not a normal website. It is a local projection-mapping style art installation for a live jam/concert at Gitana Condesa.

Core artistic idea:
The audience is the main image. Their bodies are captured through the laptop webcam and transformed into a living portal using ml5.js BodyPose. Around the main body-tracking portal, show smaller framed “Dimensiones” works as floating projection frames, like a gallery/mapping installation.

Tech:
- Next.js App Router
- TypeScript
- React
- TailwindCSS
- ml5.js BodyPose
- p5.js only if useful for canvas drawing
- Runs locally with `npm run dev`
- No backend

Visual requirements:
- Fullscreen black stage.
- High contrast for a weak projector in a bar with neon lights.
- Avoid a rectangular website look.
- Use organic frames, portals, masks, floating panels and negative space.
- Main center area: webcam body-tracking portal.
- Secondary areas: small framed artworks / CodePen iframes.
- Aesthetic: mysterious, elegant, dimensional, musical, ritual, cyber-organic.

Event phases:
1. “Apertura / Poesía”
   - Slow, subtle visuals.
   - Body skeleton appears like constellation lines.
   - Smaller artworks appear as quiet floating frames.

2. “Set Electrónico”
   - More reactive.
   - Body keypoints generate waves, particles and distortion.
   - Frames pulse with movement.

3. “Jamboteo Final”
   - Audience body becomes the main portal.
   - Multiple skeleton/keypoint trails.
   - Cymatic rings, glitch echoes, strong rhythm feeling.

4. “Gallery / Rest Mode”
   - Body tracking becomes subtle.
   - Focus on rotating framed CodePen works.

Use ml5.js BodyPose:
- Load BodyPose from ml5.
- Use the laptop webcam.
- Detect poses and body keypoints.
- Draw skeleton/keypoints onto a canvas.
- Transform the skeleton into particles, lines, rings and portal distortions.
- If BodyPose or webcam fails, use simulated body movement so the piece still works.

Controls:
- 1,2,3,4 switch phases.
- ArrowRight / ArrowLeft cycle artworks.
- Space cycle phases.
- F request fullscreen.
- H show/hide minimal help.
- M mirror/unmirror webcam body.
- G show/hide gallery frames.

Data:
Create `data/works.ts` where I can add my CodePen full URLs:

```ts
export const works = [
  {
    title: "Dimensión I",
    url: "https://codepen.io/USER/full/XXXXX",
    mood: "water"
  }
];

Components:

ProjectionStage.tsx
BodyPortal.tsx
PortalGallery.tsx
CodepenFrame.tsx
PhaseControls.tsx
useBodyPose.ts
data/works.ts

Important:

Make the audience/body-tracking portal the main visual.
Make the CodePen works secondary, like small framed dimensions.
Optimize for live projection: stable, readable, high contrast.
Do not overbuild. Prioritize a working installation today.
Include comments explaining where to add CodePens and how to adjust visuals.