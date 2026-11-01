import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows } from "@react-three/drei";
import {
  DOOR,
  ROOM,
  type Furniture,
  type Result,
  type Scene,
} from "../domain/geometry";
const BoxMesh = ({ o, highlight }: { o: Furniture; highlight: boolean }) => (
  <group position={[o.x, 0, o.z]}>
    <mesh position={[0, o.h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[o.w, o.h, o.d]} />
      <meshStandardMaterial color={o.color} roughness={0.72} metalness={0.06} />
    </mesh>
    {o.kind === "sofa" && (
      <>
        <mesh position={[0, o.h * 0.83, -o.d * 0.36]} castShadow>
          <boxGeometry args={[o.w, 0.35, 0.19]} />
          <meshStandardMaterial color="#dca68b" />
        </mesh>
        <mesh position={[-o.w * 0.45, o.h * 0.6, 0]}>
          <boxGeometry args={[0.16, 0.3, o.d]} />
          <meshStandardMaterial color="#dca68b" />
        </mesh>
      </>
    )}
    {o.kind === "desk" && (
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[o.w * 0.9, 0.12, o.d * 0.85]} />
        <meshStandardMaterial color="#695a55" />
      </mesh>
    )}
    {o.kind === "plant" && (
      <mesh position={[0, o.h + 0.15, 0]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshStandardMaterial color="#4b946e" roughness={1} />
      </mesh>
    )}
    {highlight && (
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[o.w + 0.15, 0.06, o.d + 0.15]} />
        <meshBasicMaterial color="#e6ad55" transparent opacity={0.8} />
      </mesh>
    )}
    <Text
      position={[0, o.h + 0.38, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.22}
      color="#283b3e"
      anchorX="center"
      anchorY="middle"
    >
      {o.label}
    </Text>
  </group>
);
export function World({
  scene,
  result,
  showGhost,
}: {
  scene: Scene;
  result: Result | null;
  showGhost: boolean;
}) {
  const object = scene.find((o) => o.id === result?.object);
  return (
    <Canvas shadows camera={{ position: [11, 12, 13], fov: 39 }} dpr={[1, 1.7]}>
      <color attach="background" args={["#e9ede9"]} />
      <ambientLight intensity={1.9} />
      <directionalLight
        position={[4, 11, 6]}
        intensity={2.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.025, 0]}
      >
        <planeGeometry args={[ROOM.width + 5, ROOM.depth + 5]} />
        <meshStandardMaterial color="#d9e4de" />
      </mesh>
      <mesh receiveShadow position={[0, -0.005, 0]}>
        <boxGeometry args={[ROOM.width, 0.06, ROOM.depth]} />
        <meshStandardMaterial color="#f7f1e6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, -ROOM.depth / 2]} receiveShadow>
        <boxGeometry args={[ROOM.width, 2.1, ROOM.wall]} />
        <meshStandardMaterial color="#d8dedb" transparent opacity={0.76} />
      </mesh>
      <mesh position={[-ROOM.width / 2, 1.05, 0]} receiveShadow>
        <boxGeometry args={[ROOM.wall, 2.1, ROOM.depth]} />
        <meshStandardMaterial color="#e6e6df" transparent opacity={0.65} />
      </mesh>
      {/* North wall windows */}
      <mesh position={[2.8, 1.2, -ROOM.depth / 2 + 0.13]}>
        <boxGeometry args={[2.5, 1.35, 0.04]} />
        <meshStandardMaterial color="#9bc0c4" transparent opacity={0.65} />
      </mesh>
      {/* Protected entrance region */}
      <mesh position={[DOOR.x, 0.045, DOOR.z]}>
        <boxGeometry args={[DOOR.width, 0.025, DOOR.depth]} />
        <meshStandardMaterial color="#f3c9ad" transparent opacity={0.45} />
      </mesh>
      {scene.map((o) => (
        <BoxMesh key={o.id} o={o} highlight={result?.object === o.id} />
      ))}
      {showGhost && result?.desired && object && (
        <mesh position={[result.desired.x, 0.08, result.desired.z]}>
          <boxGeometry args={[object.w, 0.12, object.d]} />
          <meshBasicMaterial
            color="#db5855"
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      )}
      <ContactShadows
        position={[0, 0.035, 0]}
        scale={18}
        blur={2.7}
        opacity={0.3}
      />
      <OrbitControls
        makeDefault
        minDistance={8}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
