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

// ========= palette =========
const COLOR_SAFFRON = "#FF9933";
const COLOR_WHITE = "#FFFFFF";
const COLOR_GREEN = "#138808";
const COLOR_CORNER = "#1A1A4E";
const COLOR_CHANCE = "#3d1a6e";
const COLOR_COMMUNITY = "#2d2a6e";
const COLOR_TAX = "#3a2a2a";
const COLOR_UTILITY = "#efe3c2";
const COLOR_GOLD = "#D4A017";

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

// Detect mobile once at module load
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
  /** Current displayed tile index per player id (driven by parent for animation). */
  positions: Record<string, number>;
  /** Highlight a tile (e.g. the current player's destination). */
  highlightTile?: number | null;
  /** Owner → color override map (from avatar). */
  ownerColors: Record<string, string>;
  /** Dice face 1..6 and whether currently rolling. */
  diceValue: number;
  isRolling: boolean;
  /** Click on the central die. */
  onRollDice: () => void;
  canRoll: boolean;
  /** Element id of the currently active player (for per-element tile FX on move). */
  activeElement: ElementId | null;
  /** Respect prefers-reduced-motion — disables bloom, dice tumble scale, etc. */
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
        camera={{ position: [0, 12, 12], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a1e"]} />
        <fog attach="fog" args={["#0a0a1e", 15, 35]} />

        <Suspense fallback={null}>
          <SceneContents {...props} />
        </Suspense>

        {!reduced && (
          <EffectComposer>
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.55}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.75} />
          </EffectComposer>
        )}

        <IdleOrbit />
      </Canvas>
    </div>
  );
}

// Auto-rotate orbit when user has been idle. Uses a shared ref via context-lite
// approach: read from a module-level signal updated by SceneContents.
const idleSignal = { lastInteract: 0 };

function IdleOrbit() {
  const controlsRef = useRef<any>(null);
  useEffect(() => {
    idleSignal.lastInteract = performance.now();
  }, []);
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0.3}
      maxPolarAngle={1.2}
      enablePan={false}
      enableZoom
      zoomSpeed={0.9}
      rotateSpeed={0.8}
      minDistance={IS_MOBILE ? 8 : 10}
      maxDistance={IS_MOBILE ? 28 : 22}
      autoRotate={false}
      onStart={() => { idleSignal.lastInteract = performance.now(); }}
      onChange={() => { idleSignal.lastInteract = performance.now(); }}
    />
  );
}

// ========= Scene =========
function SceneContents(props: Board3DProps) {
  return (
    <>
      {/* lights */}
      <hemisphereLight args={["#ffd7a0", "#1a1a3e", 0.55]} />
      <ambientLight intensity={0.25} color="#ffe3b0" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.15}
        color="#fff1c8"
        castShadow={!IS_MOBILE}
        shadow-mapSize-width={IS_MOBILE ? 512 : 1024}
        shadow-mapSize-height={IS_MOBILE ? 512 : 1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[0, 4, 0]} intensity={0.6} color={COLOR_GOLD} distance={14} />

      {/* ground shadow catcher */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.55}
        scale={18}
        blur={2.4}
        far={6}
        color="#000"
      />

      {/* platform */}
      <Platform />

      {/* central chakra */}
      <Chakra />

      {/* tiles */}
      <Tiles
        tileStates={props.tileStates}
        ownerColors={props.ownerColors}
        highlightTile={props.highlightTile ?? null}
      />

      {/* dice */}
      <Dice
        value={props.diceValue}
        isRolling={props.isRolling}
        canRoll={props.canRoll}
        onRoll={props.onRollDice}
      />

      {/* avatars */}
      {props.players
        .filter((p) => !p.isBankrupt && p.avatar)
        .map((p, i, arr) => {
          const tileIdx = props.positions[p.id] ?? 0;
          // compute which occupant slot this player holds on that tile
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

      {/* camera trailing toward active player */}
      <CameraBias
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
      {/* Outer bevelled platform */}
      <RoundedBox
        args={[11.5, 0.3, 11.5]}
        radius={0.25}
        smoothness={4}
        castShadow
        receiveShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#141432"
          metalness={0.35}
          roughness={0.6}
        />
      </RoundedBox>
      {/* Gold inlay ring on platform top */}
      <mesh position={[0, 0.151, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.1, 3.18, 64]} />
        <meshStandardMaterial color={COLOR_GOLD} emissive={COLOR_GOLD} emissiveIntensity={0.4} />
      </mesh>
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
      {/* base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.06, 48]} />
        <meshStandardMaterial
          color={COLOR_GOLD}
          metalness={0.8}
          roughness={0.25}
          emissive={COLOR_GOLD}
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* 24 spokes */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh
            key={i}
            rotation={[0, a, 0]}
            position={[0, 0.04, 0]}
          >
            <boxGeometry args={[0.08, 0.02, 2.7]} />
            <meshStandardMaterial
              color="#1A1A4E"
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        );
      })}
      {/* hub */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
        <meshStandardMaterial
          color="#1A1A4E"
          emissive={COLOR_GOLD}
          emissiveIntensity={0.4}
        />
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
  const rimRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (rimRef.current) {
      const t = state.clock.elapsedTime;
      rimRef.current.emissiveIntensity = isHighlighted
        ? 0.8 + Math.sin(t * 4) * 0.3
        : 0.05;
    }
  });

  const color = tileColor(tile);
  const w = isCorner ? 1.4 : 1.15;
  const d = isCorner ? 1.4 : 1.0;

  return (
    <group position={[x, TILE_Y, z]} rotation={[0, rotY, 0]}>
      {/* rim glow plate */}
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[w + 0.1, 0.02, d + 0.1]} />
        <meshStandardMaterial
          ref={rimRef}
          color={COLOR_GOLD}
          emissive={COLOR_GOLD}
          emissiveIntensity={isHighlighted ? 0.8 : 0.05}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* tile slab */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial
          color={color}
          metalness={tile.type === "principle" ? 0.15 : 0.3}
          roughness={0.55}
        />
      </mesh>
      {/* top color stripe for principle tiles (along outer edge) */}
      {tile.colorGroup && (
        <mesh position={[0, 0.115, -d / 2 + 0.09]}>
          <boxGeometry args={[w * 0.85, 0.015, 0.12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      )}
      {/* tile label — use navy on white tiles for contrast; gold elsewhere */}
      <Text
        position={[0, 0.12, 0.08]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={isCorner ? 0.14 : 0.095}
        color={tile.colorGroup === "white" ? COLOR_CORNER : COLOR_GOLD}
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 0.15}
        textAlign="center"
        outlineWidth={0.005}
        outlineColor={tile.colorGroup === "white" ? "#FFFFFF" : "#0a0a1e"}
      >
        {tile.name}
      </Text>
      {/* owner stripe */}
      {ownerColor && (
        <mesh position={[0, 0.115, d / 2 - 0.07]}>
          <boxGeometry args={[w * 0.7, 0.02, 0.08]} />
          <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={0.6} />
        </mesh>
      )}
      {/* layers */}
      <LayerVisual layers={layers} />
    </group>
  );
}

function LayerVisual({ layers }: { layers: number }) {
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

  if (layers <= 0) return null;
  if (layers === 1) {
    return (
      <mesh position={[0, 0.16, 0.25]}>
        <boxGeometry args={[0.22, 0.05, 0.22]} />
        <meshStandardMaterial color={COLOR_GOLD} emissive={COLOR_GOLD} emissiveIntensity={0.4} />
      </mesh>
    );
  }
  if (layers === 2) {
    return (
      <mesh position={[0, 0.2, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.06, 24]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.7} roughness={0.3} emissive={COLOR_GOLD} emissiveIntensity={0.5} />
      </mesh>
    );
  }
  if (layers === 3) {
    return (
      <SpinningTrophy />
    );
  }
  // layer 4: ornate stupa tower
  return (
    <group ref={towerRef} position={[0, 0.12, 0.15]}>
      {/* base */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.38, 0.22, 0.38]} />
        <meshStandardMaterial color="#1A1A4E" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* mid dome */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.3]} />
        <meshStandardMaterial color="#FFE9A8" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* spire */}
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.08, 0.35, 16]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.9} roughness={0.2} emissive={COLOR_GOLD} emissiveIntensity={0.7} />
      </mesh>
      {/* glowing top orb */}
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FFE9A8" emissive={COLOR_GOLD} emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 0.95, 0]} intensity={0.8} color={COLOR_GOLD} distance={2} />
    </group>
  );
}

function SpinningTrophy() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.2;
  });
  return (
    <group ref={ref} position={[0, 0.2, 0.22]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.14, 0.22, 16]} />
        <meshStandardMaterial color={COLOR_GOLD} metalness={0.85} roughness={0.2} emissive={COLOR_GOLD} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#FFE9A8" emissive={COLOR_GOLD} emissiveIntensity={0.7} />
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

  // idle float
  useFrame((_, dt) => {
    if (!group.current) return;
    if (!isRolling) {
      floatRef.current += dt;
      group.current.position.y = 1.8 + Math.sin(floatRef.current * 1.4) * 0.12;
      if (body.current) body.current.rotation.y += dt * 0.5;
    }
  });

  // roll animation
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
      y: 2.6,
      duration: 0.4,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
    }, 0);
    return () => { tl.kill(); };
  }, [isRolling]);

  // when roll settles, orient to show value
  useEffect(() => {
    if (isRolling || !body.current) return;
    // simple mapping: rotate body to show face for 'value'
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
    <group ref={group} position={[0, 1.8, 0]}>
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
        {/* dice body */}
        <mesh castShadow>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial
            color="#FFE9A8"
            metalness={0.7}
            roughness={0.25}
            emissive={COLOR_GOLD}
            emissiveIntensity={isRolling ? 0.9 : 0.25}
          />
        </mesh>
        {/* gold rim via slightly larger wireframe */}
        <mesh>
          <boxGeometry args={[1.22, 1.22, 1.22]} />
          <meshStandardMaterial color={COLOR_GOLD} wireframe transparent opacity={0.4} />
        </mesh>
        {/* pips on 6 faces */}
        <DicePips />
      </group>
      {/* supporting glow light */}
      <pointLight
        position={[0, 0, 0]}
        intensity={isRolling ? 3.5 : 1.5}
        color={COLOR_SAFFRON}
        distance={6}
      />
    </group>
  );
}

function DicePips() {
  // dots laid out for each face. offset slightly outside face.
  const h = 0.61; // half extent + a hair
  const faceRotations: Array<{ rot: [number, number, number]; pos: [number, number, number]; count: number }> = [
    { pos: [0, 0, h], rot: [0, 0, 0], count: 1 },     // +Z face → 1
    { pos: [0, 0, -h], rot: [0, Math.PI, 0], count: 6 }, // -Z → 6
    { pos: [h, 0, 0], rot: [0, Math.PI / 2, 0], count: 3 },  // +X → 3
    { pos: [-h, 0, 0], rot: [0, -Math.PI / 2, 0], count: 4 }, // -X → 4
    { pos: [0, h, 0], rot: [-Math.PI / 2, 0, 0], count: 5 },  // +Y → 5
    { pos: [0, -h, 0], rot: [Math.PI / 2, 0, 0], count: 2 },  // -Y → 2
  ];
  return (
    <group>
      {faceRotations.map((f, i) => (
        <group key={i} position={f.pos} rotation={f.rot}>
          {pipLayout(f.count).map(([px, py], j) => (
            <mesh key={j} position={[px, py, 0]}>
              <circleGeometry args={[0.08, 16]} />
              <meshStandardMaterial color="#1A1A4E" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function pipLayout(count: number): Array<[number, number]> {
  const s = 0.32;
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

// ========= avatar =========
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
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lastTile = useRef<number>(tileIndex);
  void activeElement;
  void playerId;

  const av = getAvatar(element)!;
  const color = av.color;
  const glow = av.glow;

  // Compute target world position for a tile + slot
  const targetPos = useMemo(() => {
    const x = getTileXform(tileIndex);
    const [dx, dz] = occupantOffset(slotIndex, slotCount);
    return [x.x + dx, AVATAR_Y, x.z + dz] as [number, number, number];
  }, [tileIndex, slotIndex, slotCount]);

  // Initial placement
  useEffect(() => {
    if (group.current) {
      group.current.position.set(targetPos[0], targetPos[1], targetPos[2]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When tile changes, hop from current pos to new target
  useEffect(() => {
    if (!group.current) return;
    if (tileIndex === lastTile.current) {
      // slot-only change: tween in place
      gsap.to(group.current.position, {
        x: targetPos[0], z: targetPos[2], duration: 0.25, ease: "power2.out",
      });
      return;
    }
    lastTile.current = tileIndex;
    // hop animation
    tweenRef.current?.kill();
    const pos = group.current.position;
    const tl = gsap.timeline();
    tl.to(pos, {
      y: AVATAR_Y + 0.4,
      duration: 0.12,
      ease: "power2.out",
    });
    tl.to(pos, {
      x: targetPos[0],
      z: targetPos[2],
      duration: 0.22,
      ease: "power1.inOut",
    }, "<");
    tl.to(pos, {
      y: AVATAR_Y,
      duration: 0.14,
      ease: "power2.in",
    });
  }, [tileIndex, targetPos]);

  // idle bob by element
  useFrame((state) => {
    if (!bob.current) return;
    const t = state.clock.elapsedTime;
    if (element === "air") bob.current.position.y = Math.sin(t * 2) * 0.1;
    else if (element === "water") bob.current.position.y = Math.sin(t * 1.2) * 0.06;
    else if (element === "ether") bob.current.rotation.y = t * 0.8;
    else bob.current.position.y = 0;
    // active player: subtle pulse scale
    if (isActive) {
      const s = 1 + Math.sin(t * 3) * 0.04;
      bob.current.scale.setScalar(s);
    } else {
      bob.current.scale.setScalar(1);
    }
  });

  // Element-specific visual styling
  const isTranslucent = element === "water" || element === "ether";
  const emissiveIntensity = element === "fire" ? 0.8 : element === "ether" ? 0.5 : 0.15;

  return (
    <group ref={group}>
      <group ref={bob}>
        {/* glow ring at base */}
        <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.42, 32]} />
          <meshBasicMaterial color={glow} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* body capsule */}
        <mesh castShadow position={[0, 0.05, 0]}>
          <capsuleGeometry args={[0.22, 0.35, 6, 12]} />
          <meshStandardMaterial
            color={color}
            transparent={isTranslucent}
            opacity={isTranslucent ? 0.75 : 1}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            metalness={0.25}
            roughness={0.5}
          />
        </mesh>
        {/* head sphere */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial
            color={color}
            transparent={isTranslucent}
            opacity={isTranslucent ? 0.8 : 1}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            metalness={0.3}
            roughness={0.45}
          />
        </mesh>
        {/* crown glow light when active */}
        {isActive && (
          <pointLight position={[0, 0.6, 0]} intensity={0.7} color={glow} distance={2.2} />
        )}
        {/* ether star orbiters */}
        {element === "ether" && (
          <>
            {[0, 1, 2].map((i) => (
              <EtherStar key={i} angleOffset={(i * Math.PI * 2) / 3} />
            ))}
          </>
        )}
      </group>
    </group>
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
      <meshStandardMaterial color="#FFE9A8" emissive="#D4A017" emissiveIntensity={1.5} />
    </mesh>
  );
}

// ========= camera bias =========
function CameraBias({
  positions,
  activePlayerId,
}: {
  positions: Record<string, number>;
  activePlayerId: string | null;
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));
  useFrame((_, dt) => {
    if (!activePlayerId) return;
    const idx = positions[activePlayerId] ?? 0;
    const x = getTileXform(idx);
    // bias target toward active tile by 25%
    target.current.set(x.x * 0.25, 0, x.z * 0.25);
    // Only subtly nudge — don't fight orbit controls. We lerp a look-at bias.
    // Skip if user is interacting (OrbitControls will override anyway each frame).
    camera.position.lerp(
      new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z),
      Math.min(1, dt),
    );
  });
  return null;
}
