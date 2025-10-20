import * as React from 'react';
import { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';

interface BadgeData {
  name: string;
  type: string;
  description: string;
  planetType: string;
}

interface BadgeCardProps {
  badge: BadgeData;
  index: number;
}

const badgeData: BadgeData[] = [
  {
    name: "Explorer",
    type: "Achievement",
    description: "First goal created",
    planetType: "terrestrial"
  },
  {
    name: "Pioneer",
    type: "Achievement",
    description: "First goal completed",
    planetType: "desert"
  },
  {
    name: "Guardian",
    type: "Achievement",
    description: "5-day streak achieved",
    planetType: "star"
  },
  {
    name: "Discoverer",
    type: "Achievement",
    description: "10-day streak achieved",
    planetType: "gasGiant"
  },
  {
    name: "Navigator",
    type: "Achievement",
    description: "3 goals completed",
    planetType: "ocean"
  },
  {
    name: "Voyager",
    type: "Achievement",
    description: "Maintained goals for one month",
    planetType: "ringed"
  },
  {
    name: "Scholar",
    type: "Achievement",
    description: "Reflected on your progress",
    planetType: "moon"
  },
  {
    name: "Champion",
    type: "Achievement",
    description: "Completed 10 goals",
    planetType: "lava"
  },
  {
    name: "Architect",
    type: "Achievement",
    description: "Built a balanced set of goals",
    planetType: "crystal"
  },
  {
    name: "Legend",
    type: "Achievement",
    description: "Reached mastery in your journey",
    planetType: "nebula"
  }
];

const BadgeCard: React.FC<BadgeCardProps> = ({ badge, index }) => {
  let renderer: any;
  let animationId: number;
  const planetGroupRef = useRef<THREE.Group | null>(null);
  const timeRef = useRef(0);
  const featuresRef = useRef<THREE.Object3D[]>([]);

  const createPlanetByType = (type: string, scene: THREE.Scene) => {
    const planetGroup = new THREE.Group();
    let planet: THREE.Mesh;
    const features: THREE.Object3D[] = [];

    switch (type) {
      case "terrestrial": {
        // Earth-like planet
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0x2e86ab,
          specular: 0x111111,
          shininess: 10
        });
        planet = new THREE.Mesh(geometry, material);

        // Add green landmasses
        const landGeometry = new THREE.SphereGeometry(1.01, 32, 32);
        const landMaterial = new THREE.MeshPhongMaterial({
          color: 0x2d6a4f,
          transparent: true,
          opacity: 0.7
        });
        const land = new THREE.Mesh(landGeometry, landMaterial);
        features.push(land);

        // Cloud layer
        const cloudGeometry = new THREE.SphereGeometry(1.02, 32, 32);
        const cloudMaterial = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.4,
          depthWrite: false
        });
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        features.push(clouds);
        break;
      }

      case "desert": {
        // Mars-like planet
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0xd4622a,
          bumpScale: 0.05
        });
        planet = new THREE.Mesh(geometry, material);

        // Dust storm effect
        const dustGeometry = new THREE.SphereGeometry(1.01, 32, 16);
        const dustMaterial = new THREE.MeshBasicMaterial({
          color: 0xd4622a,
          transparent: true,
          opacity: 0.2,
          depthWrite: false
        });
        const dust = new THREE.Mesh(dustGeometry, dustMaterial);
        dust.scale.y = 0.5;
        features.push(dust);
        break;
      }

      case "star": {
        // Sun-like star
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffeb3b,
          emissive: 0xffaa00,
          emissiveIntensity: 0.5
        });
        planet = new THREE.Mesh(geometry, material);

        // Corona
        const coronaGeometry = new THREE.SphereGeometry(1.3, 32, 32);
        const coronaMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 0.15,
          side: THREE.BackSide
        });
        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        features.push(corona);

        // Solar flares
        for (let i = 0; i < 10; i++) {
          const flare = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
          );
          flare.position.x = (Math.random() - 0.5) * 2.5;
          flare.position.y = (Math.random() - 0.5) * 2.5;
          flare.position.z = (Math.random() - 0.5) * 2.5;
          features.push(flare);
        }
        break;
      }

      case "gasGiant": {
        // Jupiter-like planet
        const geometry = new THREE.SphereGeometry(1.2, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0xd4a373,
          specular: 0x222222,
          shininess: 20
        });
        planet = new THREE.Mesh(geometry, material);

        // Bands
        const bandGeometry = new THREE.SphereGeometry(1.21, 32, 16);
        const bandMaterial = new THREE.MeshPhongMaterial({
          color: 0xf4e4c1,
          transparent: true,
          opacity: 0.5
        });
        const bands = new THREE.Mesh(bandGeometry, bandMaterial);
        features.push(bands);

        // Storm spot
        const stormGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const stormMaterial = new THREE.MeshPhongMaterial({
          color: 0xc1666b
        });
        const storm = new THREE.Mesh(stormGeometry, stormMaterial);
        storm.position.set(1, 0.3, 0.5);
        features.push(storm);
        break;
      }

      case "ocean": {
        // Water world
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0x0077be,
          specular: 0x4488ff,
          shininess: 100
        });
        planet = new THREE.Mesh(geometry, material);

        // Islands
        for (let i = 0; i < 5; i++) {
          const island = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0x2d6a4f })
          );
          const phi = Math.random() * Math.PI;
          const theta = Math.random() * Math.PI * 2;
          island.position.x = Math.sin(phi) * Math.cos(theta);
          island.position.y = Math.sin(phi) * Math.sin(theta);
          island.position.z = Math.cos(phi);
          features.push(island);
        }

        // Atmosphere
        const atmosGeometry = new THREE.SphereGeometry(1.1, 32, 32);
        const atmosMaterial = new THREE.MeshPhongMaterial({
          color: 0x0099ff,
          transparent: true,
          opacity: 0.1,
          depthWrite: false
        });
        const atmos = new THREE.Mesh(atmosGeometry, atmosMaterial);
        features.push(atmos);
        break;
      }

      case "ringed": {
        // Saturn-like planet
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: 0xdaa520,
          specular: 0x333333,
          shininess: 20
        });
        planet = new THREE.Mesh(geometry, material);

        // Rings
        for (let i = 0; i < 3; i++) {
          const ringGeometry = new THREE.RingGeometry(
            1.3 + i * 0.2,
            1.5 + i * 0.2,
            64
          );
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.1, 0.5, 0.7 - i * 0.1),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7 - i * 0.1
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2;
          features.push(ring);
        }
        break;
      }

      case "moon": {
        // Realistic moon
        const geometry = new THREE.SphereGeometry(0.8, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0xc0c0c0,
          bumpScale: 0.02
        });
        planet = new THREE.Mesh(geometry, material);

        // Craters
        for (let i = 0; i < 8; i++) {
          const crater = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            new THREE.MeshPhongMaterial({ color: 0x808080 })
          );
          const phi = Math.random() * Math.PI;
          const theta = Math.random() * Math.PI * 2;
          crater.position.x = 0.8 * Math.sin(phi) * Math.cos(theta);
          crater.position.y = 0.8 * Math.sin(phi) * Math.sin(theta);
          crater.position.z = 0.8 * Math.cos(phi);
          features.push(crater);
        }
        break;
      }

      case "lava": {
        // Volcanic planet
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: 0x2c2c2c,
          emissive: 0x220000,
          emissiveIntensity: 0.3
        });
        planet = new THREE.Mesh(geometry, material);

        // Lava spots
        for (let i = 0; i < 10; i++) {
          const spot = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({
              color: 0xff6600,
              emissive: 0xff6600,
              emissiveIntensity: 1
            })
          );
          const phi = Math.random() * Math.PI;
          const theta = Math.random() * Math.PI * 2;
          spot.position.x = Math.sin(phi) * Math.cos(theta);
          spot.position.y = Math.sin(phi) * Math.sin(theta);
          spot.position.z = Math.cos(phi);
          features.push(spot);
        }
        break;
      }

      case "crystal": {
        // Ice crystal planet
        const geometry = new THREE.IcosahedronGeometry(1, 1);
        const material = new THREE.MeshPhongMaterial({
          color: 0x00ffff,
          specular: 0xffffff,
          shininess: 100,
          transparent: true,
          opacity: 0.8,
          flatShading: true
        });
        planet = new THREE.Mesh(geometry, material);

        // Crystal shards
        for (let i = 0; i < 6; i++) {
          const shard = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.3, 4),
            new THREE.MeshPhongMaterial({
              color: 0x80ffff,
              specular: 0xffffff,
              shininess: 100
            })
          );
          const phi = Math.random() * Math.PI;
          const theta = Math.random() * Math.PI * 2;
          shard.position.x = Math.sin(phi) * Math.cos(theta) * 1.1;
          shard.position.y = Math.sin(phi) * Math.sin(theta) * 1.1;
          shard.position.z = Math.cos(phi) * 1.1;
          shard.lookAt(new THREE.Vector3(0, 0, 0));
          features.push(shard);
        }
        break;
      }

      case "nebula": {
        // Mystical planet
        const geometry = new THREE.SphereGeometry(1.2, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: 0x8b00ff,
          emissive: 0x4400ff,
          emissiveIntensity: 0.3,
          specular: 0xffffff,
          shininess: 50
        });
        planet = new THREE.Mesh(geometry, material);

        // Aura
        const auraGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        features.push(aura);

        // Energy rings
        const ring1 = new THREE.Mesh(
          new THREE.TorusGeometry(1.8, 0.05, 8, 64),
          new THREE.MeshBasicMaterial({ color: 0xff00ff })
        );
        ring1.rotation.x = Math.PI / 3;
        features.push(ring1);
        break;
      }

      default:
        // Default sphere
        planet = new THREE.Mesh(
          new THREE.SphereGeometry(1, 32, 32),
          new THREE.MeshPhongMaterial({ color: 0x888888 })
        );
    }

    planetGroup.add(planet);
    features.forEach(feature => planetGroup.add(feature));
    planetGroupRef.current = planetGroup;
    featuresRef.current = features;
    scene.add(planetGroup);

    return { planet, features };
  };

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    // Create renderer
    renderer = new Renderer({ gl });

    // Create scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 3.5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0x4444ff, 0.5);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Create planet
    const { planet, features } = createPlanetByType(badge.planetType, scene);

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      timeRef.current += 0.01;

      // Rotate planet group
      if (planetGroupRef.current) {
        planetGroupRef.current.rotation.y += 0.005;
      }

      // Special animations based on type
      if (badge.planetType === 'terrestrial' && featuresRef.current[1]) {
        // Rotate clouds
        featuresRef.current[1].rotation.y += 0.002;
      } else if (badge.planetType === 'star' && featuresRef.current[0]) {
        // Pulsing corona
        featuresRef.current[0].scale.setScalar(1.3 + Math.sin(timeRef.current * 2) * 0.1);
        // Moving solar flares
        for (let i = 1; i < featuresRef.current.length; i++) {
          if (featuresRef.current[i]) {
            const flare = featuresRef.current[i];
            flare.position.normalize().multiplyScalar(1.2 + Math.sin(timeRef.current * 3 + i) * 0.3);
          }
        }
      } else if (badge.planetType === 'ocean' && featuresRef.current.length > 5) {
        // Pulsing atmosphere (last feature)
        const atmosIndex = featuresRef.current.length - 1;
        featuresRef.current[atmosIndex].scale.setScalar(1.1 + Math.sin(timeRef.current * 2) * 0.02);
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

return React.createElement(
    View,  
    { style: styles.badgeCard },  
    React.createElement(
      View,
      { style: styles.badgeCanvas },
      React.createElement(GLView, {
        style: styles.glView,
        onContextCreate: onContextCreate,
        msaaSamples: 4,
        enableExperimentalWorkletSupport: false
      })
    ),
    React.createElement(Text, { style: styles.badgeName }, badge.name),
    React.createElement(Text, { style: styles.badgeType }, badge.type),
    React.createElement(Text, { style: styles.badgeDescription }, badge.description)
  );
};

const SpaceBadges: React.FC = () => {
  return React.createElement(
    ScrollView,
    { style: styles.container },
    React.createElement(Text, { style: styles.title }, "Space Badge Collection"),
    React.createElement(
      Text,
      { style: styles.subtitle },
      "10 unique detailed planets • Each with distinct features"
    ),
    React.createElement(
      View,
      { style: styles.badgesGrid },
      ...badgeData.map((badge, index) =>
        React.createElement(BadgeCard, { key: index, badge: badge, index: index })
      )
    )
  );
};

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with padding

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2e',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: cardWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeCanvas: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    marginBottom: 15,
    shadowColor: 'rgba(255, 255, 255, 0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 1,
  },
  glView: {
    width: 120,
    height: 120,
  },
  badgeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  badgeType: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 10,
  },
  badgeDescription: {
    color: '#ccc',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SpaceBadges;