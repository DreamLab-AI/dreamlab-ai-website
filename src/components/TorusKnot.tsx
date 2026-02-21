import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
// import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// --- Constants ---
const TORUS_KNOT_RADIUS = 10;
const CANVAS_TEXTURE_WIDTH = 256;
const CANVAS_TEXTURE_HEIGHT = 64;
const TEXT_FONT = 'bold 20px Arial';
const SKILL_SWAP_DEPTH_THRESHOLD_FACTOR = 1.5;

// --- Types ---
type SkillNodeProps = {
  position: [number, number, number];
  text: string;
};

interface TorusKnotProps {
  skills: string[];
}

// --- Components ---

/**
 * Renders a single skill text label as a 3D sprite.
 */
const SkillNode = ({ position, text }: SkillNodeProps) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const [opacity, setOpacity] = useState(0.25);

  // Pre-allocated vectors to avoid GC pressure in useFrame
  const tempVectors = useMemo(() => ({
    worldPos: new THREE.Vector3(),
    directionToCamera: new THREE.Vector3(),
    cameraForward: new THREE.Vector3(),
  }), []);

  const textTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_TEXTURE_WIDTH;
    canvas.height = CANVAS_TEXTURE_HEIGHT;
    const context = canvas.getContext('2d');

    if (context) {
      context.fillStyle = 'transparent';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#DAA520');

      context.fillStyle = gradient;
      context.font = TEXT_FONT;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.shadowColor = 'rgba(255, 215, 0, 0.9)';
      context.shadowBlur = 25;
      context.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [text]);

  useFrame((state) => {
    if (!spriteRef.current) return;

    // Use pre-allocated vectors to avoid GC pressure
    const worldPos = spriteRef.current.getWorldPosition(tempVectors.worldPos);
    const distanceToCamera = worldPos.distanceTo(state.camera.position);
    const directionToCamera = tempVectors.directionToCamera.copy(worldPos).sub(state.camera.position).normalize();
    const cameraForward = tempVectors.cameraForward.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
    const dotProduct = directionToCamera.dot(cameraForward);

    const maxOpacity = 0.25;
    const sideViewOpacity = 0.075;
    const visibilityDistanceThreshold = 40;
    const fullOpacityDistanceStart = 15;
    const fullOpacityDistanceEnd = fullOpacityDistanceStart + 25;

    if (dotProduct < -0.1 || distanceToCamera > visibilityDistanceThreshold) {
      setOpacity(0);
    } else if (dotProduct > 0.1) {
      const distanceFactor = Math.max(0, Math.min(1, 1 - (distanceToCamera - fullOpacityDistanceStart) / (fullOpacityDistanceEnd - fullOpacityDistanceStart)));
      setOpacity(maxOpacity * distanceFactor);
    } else {
      setOpacity(sideViewOpacity);
    }

    spriteRef.current.lookAt(state.camera.position);
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[3.0, 0.75, 1]}>
      <spriteMaterial
        map={textTexture}
        transparent={true}
        opacity={opacity}
        depthWrite={false}
        depthTest={true}
        fog={true}
        sizeAttenuation={true}
      />
    </sprite>
  );
};

/**
 * Manages the main 3D scene content: the rotating torus knot.
 */
const TorusKnotScene = ({ skills }: TorusKnotProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [nodeSkills, setNodeSkills] = useState<number[]>([]);
  const lastUpdateSecond = useRef(-1);

  const { vertices, wireframe } = useMemo(() => {
    const geometry = new THREE.TorusKnotGeometry(TORUS_KNOT_RADIUS, 1.5, 64, 3, 2, 3);
    const wireframeGeom = new THREE.EdgesGeometry(geometry);

    const posAttr = geometry.getAttribute('position');
    const uniqueVerticesMap = new Map<string, THREE.Vector3>();
    for (let i = 0; i < posAttr.count; i++) {
      const vec = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      const key = vec.toArray().map(c => c.toFixed(3)).join(',');
      if (!uniqueVerticesMap.has(key)) {
        uniqueVerticesMap.set(key, vec);
      }
    }
    return { vertices: Array.from(uniqueVerticesMap.values()), wireframe: wireframeGeom };
  }, []);

  useEffect(() => {
    if (skills.length > 0 && vertices.length > 0 && nodeSkills.length === 0) {
      const totalNodes = vertices.length;
      const initialSkills = Array.from({ length: totalNodes }, (_, i) => i % skills.length);

      for (let i = initialSkills.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initialSkills[i], initialSkills[j]] = [initialSkills[j], initialSkills[i]];
      }
      setNodeSkills(initialSkills);
    }
  }, [skills, vertices, nodeSkills.length]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.sin(t * 0.05) * 0.25, 0.02);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, Math.cos(t * 0.1) * 0.25, 0.02);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, Math.sin(t * 0.075) * 0.25, 0.02);

    const currentSecond = Math.floor(t);
    if (currentSecond % 2 === 0 && currentSecond !== lastUpdateSecond.current) {
        lastUpdateSecond.current = currentSecond;
        const skillSwapDepth = -(TORUS_KNOT_RADIUS * SKILL_SWAP_DEPTH_THRESHOLD_FACTOR);
        const nodesToUpdate: number[] = [];

        vertices.forEach((vec, nodeIndex) => {
            const worldPos = vec.clone().applyMatrix4(groupRef.current!.matrixWorld);
            if (worldPos.z < skillSwapDepth) {
                nodesToUpdate.push(nodeIndex);
            }
        });

        if (nodesToUpdate.length > 0) {
            setNodeSkills(prev => {
                const newSkills = [...prev];
                nodesToUpdate.forEach(nodeIndex => {
                    newSkills[nodeIndex] = Math.floor(Math.random() * skills.length);
                });
                return newSkills;
            });
        }
    }

    state.invalidate();
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={wireframe}>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.35} fog={true} />
      </lineSegments>
      {vertices.map((vec, i) => {
        // Since each section is a triangle (3 vertices), skip every other triangle
        if (Math.floor(i / 3) % 2 !== 0) return null;

        const skillIndex = nodeSkills[i] ?? i % skills.length;
        const text = skills[skillIndex] || "Skill";
        return (
          <SkillNode
            key={i}
            position={[vec.x, vec.y, vec.z]}
            text={text}
          />
        );
      })}
    </group>
  );
};

/**
 * The main export component that sets up the R3F Canvas.
 */
export const TorusKnot = ({ skills }: TorusKnotProps) => {
  return (
    <div className="w-full h-full" role="img" aria-label="Interactive 3D visualization of skills and technologies">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 65 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true
        }}
        dpr={[1, 2]}
        frameloop="demand"
        performance={{ min: 0.5 }}
      >
        <fog attach="fog" args={['#080820', 15, 25]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <TorusKnotScene skills={skills} />
      </Canvas>
    </div>
  );
};