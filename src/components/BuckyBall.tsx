import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Constants ---
const TORUS_KNOT_RADIUS = 10; // Radius of the torus knot
const CANVAS_TEXTURE_WIDTH = 256;
const CANVAS_TEXTURE_HEIGHT = 64;
const TEXT_FONT = 'bold 20px Arial';
const SKILL_SWAP_DEPTH_THRESHOLD_FACTOR = 1.5; // How far behind the radius center nodes must be to swap skills

// --- Types ---
/** Props for the SkillNode component */
type SkillNodeProps = {
  position: [number, number, number];
  text: string;
  visible: boolean; // Currently always true, but kept for potential future use
};

/** Props for the main BuckyBall and BuckyballScene components */
interface BuckyBallProps {
  skills: string[];
}

// --- Components ---

/**
 * Renders a single skill text label as a 3D sprite.
 * Uses a CanvasTexture for customizable text appearance and glow.
 * Handles visibility/opacity based on distance and angle to the camera.
 */
const SkillNode = ({ position, text, visible }: SkillNodeProps) => {
  const textSprite = useRef<THREE.Sprite>(null);
  const [opacity, setOpacity] = useState(0.5); // Start semi-transparent
  // Removed unused positionVector state

  // Memoized function to create the canvas texture for the text sprite
  const textTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_TEXTURE_WIDTH;
    canvas.height = CANVAS_TEXTURE_HEIGHT;
    const context = canvas.getContext('2d');

    if (context) {
      // Clear canvas
      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Create gold gradient for the text fill
      const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#FFD700'); // Brighter gold
      gradient.addColorStop(1, '#DAA520'); // Darker gold

      // Style and draw the text
      context.fillStyle = gradient;
      context.font = TEXT_FONT;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      // Apply glow effect using shadow properties
      context.shadowColor = 'rgba(255, 215, 0, 0.9)'; // Gold glow color
      context.shadowBlur = 25; // Glow radius
      // Re-draw text to apply the shadow as a glow
      context.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    // Create texture from canvas and mark for update
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [text]); // Recreate texture only when text content changes

  // Update sprite opacity and orientation every frame
  useFrame((state) => {
    if (!visible || !textSprite.current) return; // Skip if not visible or ref not ready

    // Calculate sprite's world position
    const worldPos = textSprite.current.getWorldPosition(new THREE.Vector3());
    const distanceToCamera = worldPos.distanceTo(state.camera.position);

    // Determine direction from camera to sprite
    const directionToCamera = worldPos.clone().sub(state.camera.position).normalize();
    // Determine camera's forward direction
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
    // Check if sprite is roughly in front of or behind the camera
    const dotProduct = directionToCamera.dot(cameraForward);

    // Define visibility parameters
    const maxOpacity = 0.25; // Max opacity when fully visible
    const sideViewOpacity = 0.075; // Opacity when viewed from the side
    const visibilityDistanceThreshold = 40; // Max distance to be visible
    const fullOpacityDistanceStart = 15; // Distance at which opacity starts decreasing
    const fullOpacityDistanceEnd = fullOpacityDistanceStart + 25; // Distance where opacity reaches near zero

    // Calculate opacity based on orientation and distance
    if (dotProduct < -0.1 || distanceToCamera > visibilityDistanceThreshold) {
      // Hide if behind camera or too far away
      setOpacity(0);
    } else if (dotProduct > 0.1) {
      // If in front of camera, calculate opacity based on distance
      const distanceFactor = Math.max(0, Math.min(1, 1 - (distanceToCamera - fullOpacityDistanceStart) / (fullOpacityDistanceEnd - fullOpacityDistanceStart)));
      setOpacity(maxOpacity * distanceFactor);
    } else {
      // If viewed from the side, use a fixed low opacity
      setOpacity(sideViewOpacity);
    }

    // Make sprite always face the camera (billboarding)
    textSprite.current.lookAt(state.camera.position);
  });

  // Don't render if not visible
  if (!visible) return null;

  // Render the sprite with the text texture
  return (
    <sprite
      ref={textSprite}
      position={position}
      // Scale adjusted for the current font size
      scale={[3.0, 0.75, 1]}
    >
      <spriteMaterial
        map={textTexture}
        transparent={true}
        opacity={opacity}
        depthWrite={false} // Prevents sprite from occluding objects behind it incorrectly
        depthTest={true} // Allows sprite to be occluded by objects in front
        fog={true} // Allow sprite to be affected by scene fog
        sizeAttenuation={true} // Make sprite scale smaller with distance
      />
    </sprite>
  );
};

/**
 * Manages the main 3D scene content: the rotating torus knot wireframe
 * and the associated SkillNode labels.
 */
const BuckyballScene = ({ skills }: BuckyBallProps) => { // Use BuckyBallProps interface
  const groupRef = useRef<THREE.Group>(null); // Ref for the group containing wireframe + labels
  const [nodeSkills, setNodeSkills] = useState<number[]>([]); // Stores the skill index for each node
  const [nodesToUpdate, setNodesToUpdate] = useState<number[]>([]); // Nodes whose skills need updating
  const [frameCount, setFrameCount] = useState(0); // Frame counter for timed events


  // Memoized calculation of the Torus Knot geometry
  const torusKnotGeometry = useMemo(() => {
    // Parameters: radius, tube radius, tubular segments, radial segments, p, q
    // Using 3 radial segments to create a triangular tube
    return new THREE.TorusKnotGeometry(TORUS_KNOT_RADIUS, 1.5, 64, 3, 2, 3);
  }, []);

  // Memoized extraction of vertex positions from the geometry
  const verticesVectors = useMemo(() => {
    const vertices = [];
    const positionAttribute = torusKnotGeometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const vec = new THREE.Vector3();
      vec.fromBufferAttribute(positionAttribute, i);
      vertices.push(vec);
    }
    // De-duplicate vertices to avoid placing multiple labels on the same spot
    const uniqueVerticesMap = new Map<string, THREE.Vector3>();
    vertices.forEach(v => {
        const key = v.toArray().map(c => c.toFixed(3)).join(',');
        if (!uniqueVerticesMap.has(key)) {
            uniqueVerticesMap.set(key, v);
        }
    });
    return Array.from(uniqueVerticesMap.values());
  }, [torusKnotGeometry]);

  // Memoized calculation of the wireframe geometry from the torus knot
  const wireframeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(torusKnotGeometry);
  }, [torusKnotGeometry]);

  // --- Animation and Logic Loop ---
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Use Perlin noise to create a smooth, organic rotation
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.sin(t * 0.05) * 0.25, 0.02);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.cos(t * 0.1) * 0.25, 0.02);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, Math.sin(t * 0.075) * 0.25, 0.02);

    // --- Check for Nodes Needing Skill Update ---
    // Every 10 frames, identify nodes that have moved behind the scene
    if (frameCount % 10 === 0) {
      const nodesToTriggerUpdate: number[] = [];
      const skillSwapDepth = -(TORUS_KNOT_RADIUS * SKILL_SWAP_DEPTH_THRESHOLD_FACTOR); // Calculate depth threshold

      verticesVectors.forEach((vec, nodeIndex) => {
        // Calculate the world position of the vertex considering the group's rotation
        const worldPos = vec.clone().applyMatrix4(groupRef.current!.matrixWorld);

        // If the node is deep enough behind the center, mark it for skill update
        if (worldPos.z < skillSwapDepth) {
          nodesToTriggerUpdate.push(nodeIndex);
        }
      });

      // If any nodes need updating, trigger the state change
      if (nodesToTriggerUpdate.length > 0) {
        setNodesToUpdate(nodesToTriggerUpdate);
      }
    }
  });

  // --- Skill Initialization ---
  // Initialize skill indices for each node when the component mounts or skills/vertices change
  useEffect(() => {
    // Only initialize if skills are available, vertices are calculated, and nodeSkills isn't already populated
    if (skills.length > 0 && verticesVectors.length > 0 && nodeSkills.length === 0) {
      const totalNodes = verticesVectors.length;
      const initialSkills: number[] = new Array(totalNodes);

      // Assign initial skills (cycling through the skills list)
      for (let i = 0; i < totalNodes; i++) {
        initialSkills[i] = i % skills.length;
      }

      // Shuffle the assigned skills randomly (Fisher-Yates shuffle)
      for (let i = initialSkills.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initialSkills[i], initialSkills[j]] = [initialSkills[j], initialSkills[i]];
      }

      setNodeSkills(initialSkills);
    }
  }, [skills, verticesVectors, nodeSkills.length]); // Dependencies: skills, vertices, and check if nodeSkills is empty

  // --- Skill Updates ---
  // Update skills for the specific nodes identified in the useFrame loop
  useEffect(() => {
    if (nodesToUpdate.length > 0 && skills.length > 0) {
      setNodeSkills(prev => {
        const newSkills = [...prev];
        // Assign a new random skill index to each node marked for update
        for (const nodeIndex of nodesToUpdate) {
          // Note: This simple random assignment might pick the same skill again.
          // More complex logic could be added to avoid immediate repeats if desired.
          newSkills[nodeIndex] = Math.floor(Math.random() * skills.length);
        }
        return newSkills;
      });
      // Reset the list of nodes to update
      setNodesToUpdate([]);
    }
  }, [nodesToUpdate, skills]); // Dependencies: the list of nodes to update and the skills array

  // --- Render Scene Content ---
  return (
    <group ref={groupRef}>
      {/* Buckyball Wireframe */}
      <lineSegments geometry={wireframeGeometry}>
        <lineBasicMaterial
          color="#3b82f6" // Blue color for wireframe
          transparent
          opacity={0.35}
          fog={true} // Allow fog to affect wireframe
          depthWrite={true} // Ensure proper depth sorting
        />
      </lineSegments>

      {/* Skill Labels (Sprites) */}
      {verticesVectors.map((vec, i) => {
        const position: [number, number, number] = [vec.x, vec.y, vec.z];
        // Determine the skill index, ensuring it's valid
        const skillIndex = nodeSkills[i] !== undefined ? nodeSkills[i] % skills.length : 0;
        // Get the skill text, providing a fallback if needed
        const text = skills[skillIndex] || skills[0] || "Skill"; // Added a final fallback

        return (
          <SkillNode
            key={i} // Unique key for each node
            position={position}
            text={text}
            visible={true} // Pass visibility prop
          />
        );
      })}
    </group>
  );
};


/**
 * The main export component that sets up the R3F Canvas and scene environment.
 */
export const BuckyBall = ({ skills }: BuckyBallProps) => {
  return (
    // Container div for the canvas
    <div className="w-full h-full">
      <Canvas
        // Camera setup: position and field of view
        camera={{ position: [0, 0, 20], fov: 65 }}
        // WebGL renderer settings
        gl={{ antialias: true }}
        // Device pixel ratio for sharper rendering on high-res screens
        dpr={[1, 2]}
      >
        {/* Scene fog effect */}
        <fog attach="fog" args={['#080820', 15, 25]} />
        {/* Basic ambient lighting */}
        <ambientLight intensity={0.5} />
        {/* A point light for highlights */}
        <pointLight position={[10, 10, 10]} intensity={1} />
        {/* Render the buckyball scene content */}
        <BuckyballScene skills={skills} />
        {/* OrbitControls removed as camera is fixed */}
      </Canvas>
    </div>
  );
};
