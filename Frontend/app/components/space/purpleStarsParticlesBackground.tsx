import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  className?: string;
}

const defaultColors: string[] = ['#9b59b6', '#8e44ad', '#6a1b9a'];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

// Vertex shader
const vertex = /* glsl */ `
attribute vec3 position;
attribute vec4 random;
attribute vec3 color;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uSpread;
uniform float uBaseSize;
uniform float uSizeRandomness;

varying vec4 vRandom;
varying vec3 vColor;

void main() {
  vRandom = random;
  vColor = color;

  vec3 pos = position * uSpread;
  pos.z *= 10.0;

  vec4 mPos = modelMatrix * vec4(pos, 1.0);
  float t = uTime;
  mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
  mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
  mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

  vec4 mvPos = viewMatrix * mPos;

  if (uSizeRandomness == 0.0) {
    gl_PointSize = uBaseSize;
  } else {
    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
  }

  gl_Position = projectionMatrix * mvPos;
}
`;

// Fragment shader with sharper stars
const fragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uAlphaParticles;
varying vec4 vRandom;
varying vec3 vColor;

float star(vec2 uv, float spikes) {
  vec2 p = uv - vec2(0.5);
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float m = abs(cos(spikes * angle) * 0.5 + 0.5);
  return smoothstep(0.005, 0.0, radius - m); // sharper edges
}

void main() {
  vec2 uv = gl_PointCoord.xy;
  float mask = star(uv, 5.0); // 5-pointed star
  if(mask < 0.01) discard;

  float alpha = mask;
  if(uAlphaParticles > 0.5) alpha *= 0.8;

  gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), alpha);
}
`;

const purpleParticles: React.FC<ParticlesProps> = ({
  particleCount = 300,         // more stars
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = true,
  particleBaseSize = 180,      // bigger stars
  sizeRandomness = 0.3,        // slightly varied
  cameraDistance = 20,
  disableRotation = false,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Mobile animation hooks (must be declared unconditionally)
  const fadeAnim = useRef(new Animated.Value(0.15)).current; // More transparent starting point
  const [mobileParticles, setMobileParticles] = useState<Array<{
    x: Animated.Value;
    y: Animated.Value;
    opacity: Animated.Value;
    size: number;
    color: string;
  }>>([]);
  const screenDimensions = useRef(Dimensions.get('window')).current;
  const insets = Platform.OS !== 'web' ? useSafeAreaInsets() : { bottom: 0, top: 0 };

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') return;
    
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ depth: false, alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0.161, 0.067, 0.200, 1);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener('resize', resize, false);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };

    if (moveParticlesOnHover) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    const count = particleCount;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette = particleColors && particleColors.length > 0 ? particleColors : defaultColors;

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colors.set(col, i * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors }
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 }
      },
      transparent: true,
      depthTest: false
    });

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let animationFrameId: number;
    let lastTime = performance.now();
    let elapsed = 0;

    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * speed;

      program.uniforms.uTime.value = elapsed * 0.001;

      if (moveParticlesOnHover) {
        particles.position.x = -mouseRef.current.x * particleHoverFactor;
        particles.position.y = -mouseRef.current.y * particleHoverFactor;
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
      }

      renderer.render({ scene: particles, camera });
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      if (moveParticlesOnHover) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
  }, [
    particleCount,
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    alphaParticles,
    particleBaseSize,
    sizeRandomness,
    cameraDistance,
    disableRotation
  ]);

  // Initialize mobile particles
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const particleColors = defaultColors;
    const count = Math.min(particleCount || 300, 150); // Limit for performance
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: new Animated.Value(Math.random() * screenDimensions.width),
        y: new Animated.Value(Math.random() * screenDimensions.height),
        opacity: new Animated.Value(0.3 + Math.random() * 0.7),
        size: 2 + Math.random() * 3,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }
    
    setMobileParticles(particles);
  }, [particleCount, screenDimensions]);

  // Animate mobile particles
  useEffect(() => {
    if (Platform.OS === 'web' || mobileParticles.length === 0) return;
    
    const animations = mobileParticles.map((particle, index) => {
      const duration = 8000 + Math.random() * 4000; // 8-12s (much faster)
      const delay = index * 5;
      
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(particle.x, {
              toValue: Math.random() * screenDimensions.width,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: Math.random() * screenDimensions.height,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.3,
                duration: duration / 2,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
        { iterations: -1 }
      );
    });
    
    animations.forEach(anim => anim.start());
    
    // Background fade animation (faster and more subtle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.25,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.15,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [mobileParticles, screenDimensions, fadeAnim]);

  // Mobile particle system
  if (Platform.OS !== 'web') {
    return (
      <View 
        style={[
          StyleSheet.absoluteFillObject,
          {
            width: '100%',
            height: Dimensions.get('window').height + insets.bottom,
            bottom: -insets.bottom,
            overflow: 'hidden',
          }
        ]} 
        className={className}
      >
        {/* Base gradient background - more transparent */}
        <LinearGradient
          colors={['#1a0a1f', '#291133', '#2d1640']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFillObject,
            {
              width: '100%',
              height: '100%',
            }
          ]}
        />
        
        {/* Animated overlay gradient - more transparent */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: fadeAnim,
              width: '100%',
              height: '100%',
            },
          ]}
        >
          <LinearGradient
            colors={[
              'rgba(106, 27, 154, 0.3)', // More transparent purple
              'rgba(142, 68, 173, 0.25)',
              'rgba(155, 89, 182, 0.3)'
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        
        {/* Animated particles */}
        {mobileParticles.map((particle, index) => (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
              ],
              shadowColor: particle.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: particle.size,
            }}
          />
        ))}
      </View>
    );
  }

  // Type assertion for web-only code
  const WebDiv = 'div' as any;
  return <WebDiv ref={containerRef} className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`} />;
};

export default purpleParticles;
