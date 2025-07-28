<template>
    <div class="recording-control" :class="{ 'is-recording': isRecording }">
        <canvas v-if="useWaveEffect" ref="waveCanvas" class="wave-canvas"></canvas>

        <div class="glow-effect"></div>

        <button
            @click="$emit('toggle')"
            class="record-button"
            :disabled="!isConnected || !micPermissionGranted"
            :aria-label="isRecording ? 'Stop recording' : 'Start recording'"
        >
            <Mic v-if="!isRecording" size="24" />
            <Square v-else size="20" class="stop-icon" />
        </button>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Mic, Square } from "lucide-vue-next";

const props = defineProps({
    isRecording: {
        type: Boolean,
        required: true,
    },
    isConnected: {
        type: Boolean,
        required: true,
    },
    micPermissionGranted: {
        type: Boolean,
        required: true,
    },
    formattedDuration: {
        type: String,
        default: "00:00",
    },
    useWaveEffect: {
        type: Boolean,
        default: true,
    },
});

defineEmits(["toggle"]);

const waveCanvas = ref(null);
let animationFrame = null;
let gl = null;
let program = null;
let vertexBuffer = null;
let timeUniform = null;
let resolutionUniform = null;
let startTime = null;

onMounted(() => {
    if (props.useWaveEffect && waveCanvas.value) {
        initWebGL();
    }
});

onBeforeUnmount(() => {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});

watch(
    () => props.isRecording,
    (isRecording) => {
        if (isRecording && gl) {
            startTime = Date.now();
            animateWaves();
        } else if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    },
);

function initWebGL() {
    try {
        const canvas = waveCanvas.value;
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

        if (!gl) {
            console.warn("WebGL not supported, falling back to CSS effects");
            return;
        }

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const vertexShader = createShader(
            gl,
            gl.VERTEX_SHADER,
            `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
        );

        const fragmentShader = createShader(
            gl,
            gl.FRAGMENT_SHADER,
            `
      precision mediump float;
      uniform vec2 resolution;
      uniform float time;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        float centerDistance = distance(uv, vec2(0.5, 0.5));

        // Create concentric circles that move outward
        float wave = sin(centerDistance * 15.0 - time * 2.0) * 0.5 + 0.5;

        // Fade out based on distance from center
        float opacity = max(0.0, 1.0 - centerDistance * 2.0);

        // Red glow for recording effect
        vec3 color = vec3(1.0, 0.3, 0.3);

        gl_FragColor = vec4(color, wave * opacity * 0.3);
      }
    `,
        );

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize shader program");
            return;
        }

        const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        timeUniform = gl.getUniformLocation(program, "time");
        resolutionUniform = gl.getUniformLocation(program, "resolution");

        if (props.isRecording) {
            startTime = Date.now();
            animateWaves();
        }
    } catch (error) {
        console.error("Error initializing WebGL:", error);
    }
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function resizeCanvas() {
    if (!waveCanvas.value || !gl) return;

    const canvas = waveCanvas.value;
    const container = canvas.parentElement;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function animateWaves() {
    if (!gl || !program) return;

    const elapsed = (Date.now() - startTime) / 1000;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);

    gl.uniform1f(timeUniform, elapsed);
    gl.uniform2f(resolutionUniform, waveCanvas.value.width, waveCanvas.value.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const positionAttrib = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (props.isRecording) {
        animationFrame = requestAnimationFrame(animateWaves);
    }
}
</script>

<style scoped>
.recording-control {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px 0;
    overflow: hidden;
}

.wave-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}

.glow-effect {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(
        circle,
        rgba(239, 68, 68, 0) 0%,
        rgba(239, 68, 68, 0) 50%,
        rgba(239, 68, 68, 0) 100%
    );
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 1;
}

.is-recording .glow-effect {
    background: radial-gradient(
        circle,
        rgba(239, 68, 68, 0.15) 0%,
        rgba(239, 68, 68, 0.05) 50%,
        rgba(239, 68, 68, 0) 100%
    );
    opacity: 1;
    animation: pulse 2s infinite;
}

.record-button {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: white;
    border: 1px solid #e2e8f0;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    z-index: 2;
}

.record-button:hover:not(:disabled) {
    background-color: #f8fafc;
    transform: scale(1.05);
}

.record-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.is-recording .record-button {
    background-color: #ef4444;
    color: white;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
}

.is-recording .record-button:hover {
    background-color: #dc2626;
}

.stop-icon {
    border-radius: 2px;
}

@keyframes pulse {
    0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.7;
    }
    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}
</style>
