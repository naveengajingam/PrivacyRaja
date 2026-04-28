import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Text, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { TILES, type Tile } from "@/game/tiles";
import { getAvatar, type ElementId } from "@/game/avatars";
import {
  getTileXform,
  allTileXforms,
  AVATAR_Y,
  TILE_Y,
  occupantOffset,
} from "./layout3d";

// ========= Data Compliance Quest neon palette =========
const COLOR_SAFFRON = "#FF2D6F";
const COLOR_WHITE = "#00E5FF";
const COLOR_GREEN = "#39FF88";
const COLOR_CORNER = "#0A0A1E";
const COLOR_CHANCE = "#B967FF";
const COLOR_COMMUNITY = "#FFEE00";
const COLOR_TAX = "#FF3B3B";
const COLOR_UTILITY = "#7AF8FF";
const COLOR_GOLD = "#00E5FF";

function tileColor(t: Tile): string {
  if (t.type === "principle") {
    if (t.colorGroup === "saffron") return COLOR_SAFFRON;
    if (t.colorGroup === "white") return COLOR_WHITE;
    if (t.colorGroup === "green") return COLOR_GREEN;
  }
  switch (t.type) {
    case "go":
    case "jail":
    case "free_parking":
    case "go_to_jail":
      return COLOR_CORNER;
    case "chance":
      return COLOR_CHANCE;
    case "community":
      return COLOR_COMMUNITY;
    case "tax":
      return COLOR_TAX;
    case "utility":
      return COLOR_UTILITY;
    default:
      return COLOR_CORNER;
  }
}

const IS_MOBILE = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

// ========= props =========
export interface Board3DPlayer {
  id: string;
  avatar: ElementId | null;
  isBankrupt: boolean;
}
export interface Board3DTileState {
  tileIndex: number;
  ownerId: string | null;
  layers: number;
}
export interface Board3DProps {
  players: Board3DPlayer[];
  tileStates: Board3DTileState[];
  positions: Record<string, number>;
  highlightTile?: number | null;
  ownerColors: Record<string, string>;
  diceValue: number;
  isRolling: boolean;
  onRollDice: () => void;
  canRoll: boolean;
  activeElement: ElementId | null;
  reducedMotion?: boolean;
}

// ========= Board3D root =========
export default function Board3D(props: Board3DProps) {
  const reduced = !!props.reducedMotion;
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={!IS_MOBILE && !reduced}
        dpr={[1, 2]}
        camera={{ position: [0, 11, 13], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#04040f"]} />
        <fog attach="fog" args={["#05051a", 16, 42]} />

        <Suspense fallback={null}>
          <SceneContents {...props} />
        </Suspense>

        {!reduced && (
          <EffectComposer>
            <Bloom
              intensity={1.5}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.88} />
          </EffectComposer>
        )}

        <SceneOrbit />
      </Canvas>
    </div>
  );
}

function SceneOrbit() {
  return (
    <OrbitControls
      makeDefault
      minPolarAngle={0.25}
      maxPolarAngle={1.25}
      enablePan={false}
      enableZoom
      zoomSpeed={0.9}
      rotateSpeed={0.8}
      minDistance={IS_MOBILE ? 9 : 11}
      maxDistance={IS_MOBILE ? 28 : 24}
    />
  );
}

// ========= Scene =========
function SceneContents(props: Board3DProps) {
  return (
    <>
      {/* lights — cool neon wash + magenta rim */}
      <hemisphereLight args={["#7af8ff", "#0a0420", 0.5]} />
      <ambientLight intensity={0.28} color="#b8f4ff" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.1}
        color="#ccf7ff"
        castShadow={!IS_MOBILE}
        shadow-mapSize-width={IS_MOBILE ? 512 : 1024}
        shadow-mapSize-height={IS_MOBILE ? 512 : 1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[0, 4, 0]} intensity={0.9} color={COLOR_GOLD} distance={16} />
      <pointLight position={[-6, 3, -6]} intensity={0.8} color="#FF2D6F" distance={14} />
      <pointLight position={[6, 3, 6]} intensity={0.8} color="#B967FF" distance={14} />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.6}
        scale={20}
        blur={2.6}
        far={6}
        color="#000"
      />

      <Platform />
      <Chakra />

      <Tiles
        tileStates={props.tileStates}
        ownerColors={props.ownerColors}
        highlightTile={props.highlightTile ?? null}
      />

      <Dice
        value={props.diceValue}
        isRolling={props.isRolling}
        canRoll={props.canRoll}
        onRoll={props.onRollDice}
      />

      {props.players
        .filter((p) => !p.isBankrupt && p.avatar)
        .map((p, _i, arr) => {
          const tileIdx = props.positions[p.id] ?? 0;
          const coTenants = arr.filter((q) => (props.positions[q.id] ?? 0) === tileIdx);
          const slot = coTenants.findIndex((q) => q.id === p.id);
          return (
            <Avatar
              key={p.id}
              playerId={p.id}
              element={p.avatar as ElementId}
              tileIndex={tileIdx}
              slotIndex={slot}
              slotCount={coTenants.length}
              activeElement={props.activeElement}
              isActive={props.activeElement === p.avatar}
            />
          );
        })}

      <CinematicCamera
        positions={props.positions}
        activePlayerId={
          props.players.find((p) => p.avatar === props.activeElement)?.id ?? null
        }
      />
    </>
  );
}

// ========= platform =========
function Platform() {
  return (
    <group>
      {/* outer bevelled base */}
      <RoundedBox
        args={[11.8, 0.5, 11.8]}
        radius={0.3}
        smoothness={4}
        castShadow
        receiveShadow
        position={[0, -0.15, 0]}
      >
        <meshStandardMaterial
          color="#0a0a1e"
          metalness={0.75}
          roughness={0.3}
          emissive="#05051a"
          emissiveIntensity={0.5}
        />
      </RoundedBox>
      {/* glass playfield */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[11.3, 0.06, 11.3]} />
        <meshPhysicalMaterial
          color="#0b0b24"
          metalness={0.3}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={0.25}
          thickness={0.6}
          emissive="#0a0a30"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* neon edge ring */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.6, 5.72, 96]} />
        <meshBasicMaterial color={COLOR_GOLD} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.05, 3.18, 64]} />
        <meshStandardMaterial color={COLOR_GOLD} emissive={COLOR_GOLD} emissiveIntensity={0.5} />
      </mesh>
      {/* grid lines on interior */}
      <gridHelper args={[9, 18, "#00E5FF", "#0a3a4a"]} position={[0, 0.158, 0]} />
    </group>
  );
}

// ========= chakra center =========
function Chakra() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
  });
  return (
    <group ref={ref} position={[0, TILE_Y + 0.02, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.06, 48]} />
        <meshStandardMaterial
          color={COLOR_GOLD}
          metalness={0.8}
          roughness={0.25}
          emissive={COLOR_GOLD}
          emissiveIntensity={0.3}
        />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} rotation={[0, a, 0]} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.02, 2.7]} />
            <meshStandardMaterial color="#0a0a1e" metalness={0.3} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
        <meshStandardMaterial color="#0a0a1e" emissive={COLOR_GOLD} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ========= tiles =========
function Tiles({
  tileStates,
  ownerColors,
  highlightTile,
}: {
  tileStates: Board3DTileState[];
  ownerColors: Record<string, string>;
  highlightTile: number | null;
}) {
  const xforms = allTileXforms();
  return (
    <group>
      {TILES.map((t, i) => {
        const x = xforms[i];
        const ts = tileStates.find((s) => s.tileIndex === t.index);
        const ownerColor = ts?.ownerId ? ownerColors[ts.ownerId] ?? null : null;
        return (
          <TileMesh
            key={t.index}
            tile={t}
            x={x.x}
            z={x.z}
            rotY={x.rotY}
            isCorner={x.isCorner}
            layers={ts?.layers ?? 0}
            ownerColor={ownerColor}
            isHighlighted={highlightTile === t.index}
          />
        );
      })}
    </group>
  );
}

function TileMesh({
  tile,
  x,
  z,
  rotY,
  isCorner,
  layers,
  ownerColor,
  isHighlighted,
}: {
  tile: Tile;
  x: number;
  z: number;
  rotY: number;
  isCorner: boolean;
  layers: number;
  ownerColor: string | null;
  isHighlighted: boolean;
}) {
  const rimRef = useRef<THREE.MeshBasicMaterial>(null);
  const slabRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (rimRef.current) {
      rimRef.current.opacity = isHighlighted ? 0.7 + Math.sin(t * 4) * 0.3 : 0.35;
    }
    if (slabRef.current) {
      slabRef.current.position.y = isHighlighted ? 0.06 + Math.sin(t * 3) * 0.04 : 0;
    }
  });

  const color = tileColor(tile);
  const w = isCorner ? 1.55 : 1.2;
  const d = isCorner ? 1.55 : 1.05;
  const height = isCorner ? 0.32 : 0.22;

  return (
    <group position={[x, TILE_Y, z]} rotation={[0, rotY, 0]}>
      {/* neon rim halo (flat) */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.25, d + 0.25]} />
        <meshBasicMaterial
          ref={rimRef}
          color={isHighlighted ? COLOR_GOLD : color}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* raised glassy tile block */}
      <group ref={slabRef}>
        <RoundedBox
          args={[w, height, d]}
          radius={0.08}
          smoothness={3}
          position={[0, height / 2 + 0.01, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={color}
            metalness={0.4}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={color}
            emissiveIntensity={isHighlighted ? 0.45 : 0.18}
          />
        </RoundedBox>

        {/* top cap bevel (darker glass) */}
        <mesh position={[0, height + 0.015, 0]} receiveShadow>
          <boxGeometry args={[w * 0.94, 0.012, d * 0.94]} />
          <meshStandardMaterial
            color="#0a0a1e"
            metalness={0.8}
            roughness={0.18}
            emissive={color}
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* color stripe along outer edge */}
        {tile.colorGroup && (
          <mesh position={[0, height + 0.025, -d / 2 + 0.09]}>
            <boxGeometry args={[w * 0.85, 0.018, 0.1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
        )}

        {/* tile icon mesh (pictographic 3D element) */}
        <TileIcon tile={tile} height={height} />

        {/* label */}
        <Text
          position={[0, height + 0.03, 0.22]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={isCorner ? 0.14 : 0.085}
          color={tile.colorGroup === "white" ? COLOR_CORNER : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          maxWidth={w - 0.15}
          textAlign="center"
          outlineWidth={0.006}
          outlineColor="#0a0a1e"
        >
          {tile.name.toUpperCase()}
        </Text>

        {/* owner stripe */}
        {ownerColor && (
          <mesh position={[0, height + 0.025, d / 2 - 0.08]}>
            <boxGeometry args={[w * 0.7, 0.022, 0.08]} />
            <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={0.9} />
          </mesh>
        )}

        <LayerVisual layers={layers} tileHeight={height} />
      </group>
    </group>
  );
}

// Pictographic icon mesh per tile-type (RTS-style miniature)
function TileIcon({ tile, height }: { tile: Tile; height: number }) {
  const y = height + 0.04;
  switch (tile.type) {
    case "go":
      return (
        <group position={[0, y + 0.02, -0.15]}>
          <mesh>
            <coneGeometry args={[0.18, 0.3, 4]} />
            <meshStandardMaterial color={COLOR_GOLD} emissive={COLOR_GOLD} emissiveIntensity={0.8} metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      );
    case "jail":
      return (
        <group position={[0, y, -0.15]}>
          {[-0.1, 0, 0.1].map((px) => (
            <mesh key={px} position={[px, 0.12, 0]}>
              <boxGeometry args={[0.03, 0.24, 0.03]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      );
    case "go_to_jail":
      return (
        <mesh position={[0, y + 0.08, -0.15]} rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16]} />
          <meshStandardMaterial color={COLOR_TAX} emissive={COLOR_TAX} emissiveIntensity={0.7} />
        </mesh>
      );
    case "free_parking":
      return (
        <mesh position={[0, y + 0.06, -0.15]}>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshPhysicalMaterial color={COLOR_GREEN} emissive={COLOR_GREEN} emissiveIntensity={0.6} metalness={0.6} roughness={0.2} clearcoat={1} />
        </mesh>
      );
    case "principle":
      // stylized "data crystal" obelisk
      return (
        <group position={[0, y, -0.18]}>
          <mesh position={[0, 0.12, 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshPhysicalMaterial
              color="#ffffff"
              emissive={tileColor(tile)}
              emissiveIntensity={0.9}
              metalness={0.4}
              roughness={0.1}
              clearcoat={1}
              transmission={0.3}
              thickness={0.4}
            />
          </mesh>
        </group>
      );
    case "chance":
      return (
        <mesh position={[0, y + 0.08, -0.15]}>
          <torusKnotGeometry args={[0.09, 0.028, 48, 8]} />
          <meshStandardMaterial color={COLOR_CHANCE} emissive={COLOR_CHANCE} emissiveIntensity={0.8} metalness={0.7} roughness={0.2} />
        </mesh>
      );
    case "community":
      return (
        <mesh position={[0, y + 0.06, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 6]} />
          <meshStandardMaterial color={COLOR_COMMUNITY} emissive={COLOR_COMMUNITY} emissiveIntensity={0.6} metalness={0.8} roughness={0.2} />
        </mesh>
      );
    case "tax":
      return (
        <mesh position={[0, y + 0.1, -0.15]}>
          <coneGeometry args={[0.12, 0.22, 3]} />
          <meshStandardMaterial color={COLOR_TAX} emissive={COLOR_TAX} emissiveIntensity={0.7} />
        </mesh>
      );
    case "utility":
      return (
        <mesh position={[0, y + 0.08, -0.15]}>
          <dodecahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial color={COLOR_UTILITY} emissive={COLOR_UTILITY} emissiveIntensity={0.6} metalness={0.7} roughness={0.2} />
        </mesh>
      );
    default:
      return null;
  }
}

function LayerVisual({ layers, tileHeight }: { layers: number; tileHeight: number }) {
  const towerRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (layers >= 4 && towerRef.current) {
      towerRef.current.scale.set(0.01, 0.01, 0.01);
      gsap.to(towerRef.current.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
      });
    }
  }, [layers]);

  const baseY = tileHeight + 0.05;

  if (layers <= 0) return null;
  if (layers === 1) {
    return (
      <mesh position={[0, baseY, 0.25]}>
        <boxGeometry args={[0.22, 0.05, 0.22]} />
        <meshStandardMaterial color={COLOR_GOLD} emissive={COLOR_GOLD} emissiveIntensity={0.5} />
      </mesh>
    );
  }
  if (layers === 2) {
    return (
      <mesh position={[0, baseY + 0.03, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.06, 24]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.7} roughness={0.3} emissive={COLOR_GOLD} emissiveIntensity={0.6} />
      </mesh>
    );
  }
  if (layers === 3) {
    return <SpinningTrophy baseY={baseY} />;
  }
  return (
    <group ref={towerRef} position={[0, baseY, 0.15]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.38, 0.22, 0.38]} />
        <meshStandardMaterial color="#0a0a1e" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.3]} />
        <meshStandardMaterial color="#7af8ff" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.08, 0.35, 16]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.9} roughness={0.2} emissive={COLOR_GOLD} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#7af8ff" emissive={COLOR_GOLD} emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 0.95, 0]} intensity={0.8} color={COLOR_GOLD} distance={2} />
    </group>
  );
}

function SpinningTrophy({ baseY }: { baseY: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.2;
  });
  return (
    <group ref={ref} position={[0, baseY + 0.05, 0.22]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.14, 0.22, 16]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.85} roughness={0.2} emissive={COLOR_GOLD} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#7af8ff" emissive={COLOR_GOLD} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

// ========= dice =========
function Dice({
  value,
  isRolling,
  canRoll,
  onRoll,
}: {
  value: number;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const floatRef = useRef(0);

  useFrame((_, dt) => {
    if (!group.current) return;
    if (!isRolling) {
      floatRef.current += dt;
      group.current.position.y = 2.0 + Math.sin(floatRef.current * 1.4) * 0.12;
      if (body.current) body.current.rotation.y += dt * 0.5;
    }
  });

  useEffect(() => {
    if (!isRolling || !body.current || !group.current) return;
    const tl = gsap.timeline();
    tl.to(body.current.rotation, {
      x: "+=" + Math.PI * 6,
      y: "+=" + Math.PI * 4,
      z: "+=" + Math.PI * 5,
      duration: 1.6,
      ease: "power2.out",
    }, 0);
    tl.to(group.current.position, {
      y: 2.8,
      duration: 0.4,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    }, 0);
    return () => { tl.kill(); };
  }, [isRolling]);

  useEffect(() => {
    if (isRolling || !body.current) return;
    const rotations: Record<number, [number, number, number]> = {
      1: [0, 0, 0],
      2: [Math.PI / 2, 0, 0],
      3: [0, 0, -Math.PI / 2],
      4: [0, 0, Math.PI / 2],
      5: [-Math.PI / 2, 0, 0],
      6: [Math.PI, 0, 0],
    };
    const r = rotations[value] ?? [0, 0, 0];
    gsap.to(body.current.rotation, {
      x: r[0], y: r[1], z: r[2], duration: 0.5, ease: "power3.out",
    });
  }, [value, isRolling]);

  return (
    <group ref={group} position={[0, 2.0, 0]}>
      <group
        ref={body}
        onClick={(e) => {
          e.stopPropagation();
          if (canRoll && !isRolling) onRoll();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = canRoll ? "pointer" : "default";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshPhysicalMaterial
            color="#7af8ff"
            metalness={0.7}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.05}
            emissive={COLOR_GOLD}
            emissiveIntensity={isRolling ? 1.1 : 0.35}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[1.12, 1.12, 1.12]} />
          <meshStandardMaterial color={COLOR_GOLD} wireframe transparent opacity={0.45} />
        </mesh>
        <DicePips />
      </group>
      <pointLight
        position={[0, 0, 0]}
        intensity={isRolling ? 3.5 : 1.6}
        color={COLOR_SAFFRON}
        distance={6}
      />
    </group>
  );
}

function DicePips() {
  const h = 0.56;
  const faceRotations: Array<{ rot: [number, number, number]; pos: [number, number, number]; count: number }> = [
    { pos: [0, 0, h], rot: [0, 0, 0], count: 1 },
    { pos: [0, 0, -h], rot: [0, Math.PI, 0], count: 6 },
    { pos: [h, 0, 0], rot: [0, Math.PI / 2, 0], count: 3 },
    { pos: [-h, 0, 0], rot: [0, -Math.PI / 2, 0], count: 4 },
    { pos: [0, h, 0], rot: [-Math.PI / 2, 0, 0], count: 5 },
    { pos: [0, -h, 0], rot: [Math.PI / 2, 0, 0], count: 2 },
  ];
  return (
    <group>
      {faceRotations.map((f, i) => (
        <group key={i} position={f.pos} rotation={f.rot}>
          {pipLayout(f.count).map(([px, py], j) => (
            <mesh key={j} position={[px, py, 0]}>
              <circleGeometry args={[0.08, 16]} />
              <meshStandardMaterial color="#0a0a1e" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function pipLayout(count: number): Array<[number, number]> {
  const s = 0.3;
  switch (count) {
    case 1: return [[0, 0]];
    case 2: return [[-s, s], [s, -s]];
    case 3: return [[-s, s], [0, 0], [s, -s]];
    case 4: return [[-s, s], [s, s], [-s, -s], [s, -s]];
    case 5: return [[-s, s], [s, s], [0, 0], [-s, -s], [s, -s]];
    case 6: return [[-s, s], [s, s], [-s, 0], [s, 0], [-s, -s], [s, -s]];
    default: return [[0, 0]];
  }
}

// ========= Avatar — humanoid, DBZ/Clash-style =========
function Avatar({
  playerId,
  element,
  tileIndex,
  slotIndex,
  slotCount,
  activeElement,
  isActive,
}: {
  playerId: string;
  element: ElementId;
  tileIndex: number;
  slotIndex: number;
  slotCount: number;
  activeElement: ElementId | null;
  isActive: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const lArm = useRef<THREE.Group>(null);
  const rArm = useRef<THREE.Group>(null);
  const lLeg = useRef<THREE.Group>(null);
  const rLeg = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const lastTile = useRef<number>(tileIndex);
  void activeElement;
  void playerId;

  const av = getAvatar(element)!;
  const color = av.color;
  const glow = av.glow;

  const targetPos = useMemo(() => {
    const x = getTileXform(tileIndex);
    const [dx, dz] = occupantOffset(slotIndex, slotCount);
    return [x.x + dx, AVATAR_Y, x.z + dz] as [number, number, number];
  }, [tileIndex, slotIndex, slotCount]);

  useEffect(() => {
    if (group.current) {
      group.current.position.set(targetPos[0], targetPos[1], targetPos[2]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // attack-move animation: hop forward with element trail
  useEffect(() => {
    if (!group.current) return;
    if (tileIndex === lastTile.current) {
      gsap.to(group.current.position, {
        x: targetPos[0], z: targetPos[2], duration: 0.25, ease: "power2.out",
      });
      return;
    }
    lastTile.current = tileIndex;
    setMoving(true);
    const pos = group.current.position;
    const tl = gsap.timeline({
      onComplete: () => setMoving(false),
    });
    // face the movement direction
    const dx = targetPos[0] - pos.x;
    const dz = targetPos[2] - pos.z;
    if (group.current) {
      const ang = Math.atan2(dx, dz);
      gsap.to(group.current.rotation, { y: ang, duration: 0.18, ease: "power2.out" });
    }
    // attack-arc: launch up, fly, land
    tl.to(pos, { y: AVATAR_Y + 0.6, duration: 0.14, ease: "power2.out" });
    tl.to(pos, { x: targetPos[0], z: targetPos[2], duration: 0.24, ease: "power1.inOut" }, "<");
    tl.to(pos, { y: AVATAR_Y, duration: 0.16, ease: "power2.in" });
  }, [tileIndex, targetPos]);

  // idle + running limb animation
  useFrame((state) => {
    if (!bob.current) return;
    const t = state.clock.elapsedTime;
    if (moving) {
      // running limbs
      const sw = Math.sin(t * 22) * 0.9;
      if (lArm.current) lArm.current.rotation.x = sw;
      if (rArm.current) rArm.current.rotation.x = -sw;
      if (lLeg.current) lLeg.current.rotation.x = -sw * 0.8;
      if (rLeg.current) rLeg.current.rotation.x = sw * 0.8;
      bob.current.position.y = Math.abs(Math.sin(t * 22)) * 0.05;
    } else {
      // idle per element
      const idle = Math.sin(t * 2) * 0.05;
      if (lArm.current) lArm.current.rotation.x = idle;
      if (rArm.current) rArm.current.rotation.x = -idle;
      if (lLeg.current) lLeg.current.rotation.x = 0;
      if (rLeg.current) rLeg.current.rotation.x = 0;
      if (element === "air") bob.current.position.y = Math.sin(t * 2) * 0.1;
      else if (element === "water") bob.current.position.y = Math.sin(t * 1.2) * 0.06;
      else if (element === "ether") bob.current.rotation.y = t * 0.8;
      else bob.current.position.y = Math.sin(t * 2) * 0.02;
    }
    if (isActive) {
      const s = 1 + Math.sin(t * 3) * 0.04;
      bob.current.scale.setScalar(s);
    } else {
      bob.current.scale.setScalar(1);
    }
  });

  const isTranslucent = element === "water" || element === "ether";
  const emissiveIntensity = element === "fire" ? 0.9 : element === "ether" ? 0.6 : 0.25;

  // Material shared values
  const matProps = {
    color,
    transparent: isTranslucent,
    opacity: isTranslucent ? 0.82 : 1,
    emissive: color,
    emissiveIntensity,
    metalness: 0.35,
    roughness: 0.4,
  };

  return (
    <group ref={group}>
      <group ref={bob}>
        {/* ground glow disc */}
        <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.44, 32]} />
          <meshBasicMaterial color={glow} transparent opacity={isActive ? 0.9 : 0.55} side={THREE.DoubleSide} />
        </mesh>

        {/* left leg */}
        <group ref={lLeg} position={[-0.09, -0.25, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.18, 4, 8]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
        {/* right leg */}
        <group ref={rLeg} position={[0.09, -0.25, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.18, 4, 8]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>

        {/* torso */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.24, 6, 12]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {/* chest insignia */}
        <mesh position={[0, 0.04, 0.18]}>
          <circleGeometry args={[0.08, 16]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.2} />
        </mesh>

        {/* left arm */}
        <group ref={lArm} position={[-0.22, 0.1, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
        {/* right arm */}
        <group ref={rArm} position={[0.22, 0.1, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>

        {/* head */}
        <mesh position={[0, 0.36, 0]} castShadow>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        {/* eyes (glowing dots) */}
        <mesh position={[-0.06, 0.37, 0.14]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.06, 0.37, 0.14]}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* element-specific crown/hair */}
        <ElementCrown element={element} glow={glow} color={color} />

        {isActive && (
          <pointLight position={[0, 0.5, 0]} intensity={0.9} color={glow} distance={2.4} />
        )}

        {element === "ether" && (
          <>
            {[0, 1, 2].map((i) => (
              <EtherStar key={i} angleOffset={(i * Math.PI * 2) / 3} />
            ))}
          </>
        )}

        {/* element attack trail during move */}
        {moving && <ElementTrail element={element} color={color} glow={glow} />}
      </group>
    </group>
  );
}

function ElementCrown({ element, glow, color }: { element: ElementId; glow: string; color: string }) {
  if (element === "fire") {
    // flame cone on head
    return (
      <group position={[0, 0.54, 0]}>
        <mesh>
          <coneGeometry args={[0.12, 0.26, 12]} />
          <meshStandardMaterial color={glow} emissive={color} emissiveIntensity={1.4} transparent opacity={0.9} />
        </mesh>
      </group>
    );
  }
  if (element === "water") {
    return (
      <mesh position={[0, 0.54, 0]}>
        <sphereGeometry args={[0.1, 12, 10]} />
        <meshPhysicalMaterial color={color} transmission={0.85} thickness={0.6} roughness={0.1} emissive={glow} emissiveIntensity={0.5} />
      </mesh>
    );
  }
  if (element === "earth") {
    return (
      <mesh position={[0, 0.53, 0]}>
        <dodecahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
    );
  }
  if (element === "air") {
    return (
      <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.02, 8, 18]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.9} transparent opacity={0.7} />
      </mesh>
    );
  }
  if (element === "ether") {
    return (
      <mesh position={[0, 0.56, 0]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshPhysicalMaterial color={glow} emissive={glow} emissiveIntensity={1.2} transmission={0.4} thickness={0.4} />
      </mesh>
    );
  }
  return null;
}

// Attack-move trail: element-specific particles that linger behind the avatar
function ElementTrail({ element, color, glow }: { element: ElementId; color: string; glow: string }) {
  const N = 10;
  const points = Array.from({ length: N }, (_, i) => i);
  return (
    <group>
      {points.map((i) => (
        <TrailParticle
          key={i}
          delay={i * 0.04}
          element={element}
          color={color}
          glow={glow}
        />
      ))}
    </group>
  );
}

function TrailParticle({ delay, element, color, glow }: { delay: number; element: ElementId; color: string; glow: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const life = useRef(-delay);
  useFrame((_, dt) => {
    if (!ref.current) return;
    life.current += dt;
    const t = (life.current % 0.6) / 0.6;
    const yOffset = element === "air" ? 0.1 : element === "ether" ? 0.2 : 0;
    ref.current.position.set(
      (Math.random() - 0.5) * 0.2,
      yOffset - t * 0.3,
      -0.25 - t * 0.6,
    );
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = (1 - t) * 0.8;
    ref.current.scale.setScalar(0.12 * (1 - t * 0.4));
  });

  const particleColor =
    element === "fire" ? "#FFB347" :
    element === "water" ? "#5DADE2" :
    element === "earth" ? "#D4A017" :
    element === "air" ? "#FFFFFF" :
    glow;

  const geom =
    element === "fire" ? <icosahedronGeometry args={[1, 0]} /> :
    element === "water" ? <sphereGeometry args={[1, 8, 6]} /> :
    element === "earth" ? <boxGeometry args={[1, 1, 1]} /> :
    element === "air" ? <torusGeometry args={[0.7, 0.25, 6, 12]} /> :
    <octahedronGeometry args={[1, 0]} />;

  void color;
  return (
    <mesh ref={ref}>
      {geom}
      <meshBasicMaterial color={particleColor} transparent opacity={0.7} />
    </mesh>
  );
}

function EtherStar({ angleOffset }: { angleOffset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 1.5 + angleOffset;
    ref.current.position.x = Math.cos(t) * 0.5;
    ref.current.position.z = Math.sin(t) * 0.5;
    ref.current.position.y = 0.3 + Math.sin(t * 2) * 0.15;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial color="#7af8ff" emissive="#00E5FF" emissiveIntensity={1.5} />
    </mesh>
  );
}

// ========= Cinematic camera — dolly to active piece during its turn =========
function CinematicCamera({
  positions,
  activePlayerId,
}: {
  positions: Record<string, number>;
  activePlayerId: string | null;
}) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3(0, 11, 13));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const lastTile = useRef<number | null>(null);
  const focusUntil = useRef(0);

  useFrame((_, dt) => {
    if (!activePlayerId) return;
    const idx = positions[activePlayerId];
    if (idx == null) return;
    if (lastTile.current !== idx) {
      lastTile.current = idx;
      focusUntil.current = performance.now() + 1400;
    }
    const now = performance.now();
    const focused = now < focusUntil.current;

    const x = getTileXform(idx);
    if (focused) {
      // low-angle dolly offset from the tile, looking at the tile
      const offsetRadius = 4.5;
      const ang = Math.atan2(x.z, x.x);
      desired.current.set(
        x.x + Math.cos(ang) * offsetRadius * 0.35,
        4.5,
        x.z + Math.sin(ang) * offsetRadius * 0.35 + 3.5,
      );
      targetLook.current.set(x.x, 0.5, x.z);
    } else {
      // overview
      desired.current.set(0, 11, 13);
      targetLook.current.set(0, 0, 0);
    }

    // smooth lerp
    const k = Math.min(1, dt * 1.6);
    camera.position.lerp(desired.current, k);
    // Look-at is handled by OrbitControls target, which we don't own; just
    // rotate camera gently toward tile.
    const lookTarget = new THREE.Vector3().copy(targetLook.current);
    const tmp = new THREE.Vector3().copy(camera.position).add(
      new THREE.Vector3().subVectors(lookTarget, camera.position).multiplyScalar(k),
    );
    void tmp;
    camera.lookAt(lookTarget);
  });
  return null;
}
