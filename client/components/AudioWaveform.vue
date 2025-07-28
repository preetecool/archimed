<template>
    <div class="waveform-container" :class="{ recording: isRecording }" ref="containerRef">
        <div class="waveform-scroll-container">
            <div class="center-line"></div>
            <div class="waveform-track">
                <div
                    v-for="(bar, index) in displayBars"
                    :key="index"
                    class="bar-wrapper"
                    :style="{
                        left: `${index * barSpacing + scrollPosition}px`,
                    }"
                >
                    <div class="bar bar-top" :style="{ height: `${Math.max(2, bar / 2)}px` }"></div>
                    <div
                        class="bar bar-bottom"
                        :style="{ height: `${Math.max(2, bar / 2)}px` }"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from "vue";

const props = defineProps({
    isRecording: {
        type: Boolean,
        default: false,
    },
    audioStream: {
        type: Object,
        default: null,
    },
});

const analyser = ref(null);
const audioContext = ref(null);
const animationFrame = ref(null);
const scrollPosition = ref(0);
const bars = ref(Array(300).fill(4));
const currentIndex = ref(0);
const containerRef = ref(null);
const containerWidth = ref(0);
const visibleBars = ref(0);
const barSpacing = 8;

const calculateVisibleBars = () => {
    if (containerWidth.value && barSpacing) {
        visibleBars.value = Math.ceil(containerWidth.value / barSpacing) + 5;
    }
};

const initializeBars = () => {
    const initialBars = [];
    for (let i = 0; i < 300; i++) {
        const random = Math.random();
        if (random > 0.9) {
            initialBars.push(6 + random * 4);
        } else {
            initialBars.push(2 + random * 3);
        }
    }
    bars.value = initialBars;
};

const displayBars = computed(() => {
    return bars.value;
});

const scrollSpeed = 2;
const animationSpeed = 16;

const setupAudioAnalysis = () => {
    if (!props.audioStream || !window.AudioContext) {
        simulateRecording();
        return;
    }

    try {
        audioContext.value = new (window.AudioContext || window.webkitAudioContext)();

        analyser.value = audioContext.value.createAnalyser();
        analyser.value.fftSize = 256;
        analyser.value.smoothingTimeConstant = 0.7;

        const source = audioContext.value.createMediaStreamSource(props.audioStream);
        source.connect(analyser.value);

        startRecordingAnimation();
    } catch (error) {
        console.error("Error setting up audio analysis:", error);
        simulateRecording();
    }
};

const startRecordingAnimation = () => {
    if (!analyser.value) {
        simulateRecording();
        return;
    }

    const bufferLength = analyser.value.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let lastUpdateTime = Date.now();
    initializeBars();

    const animate = () => {
        if (!props.isRecording) {
            cancelAnimationFrame(animationFrame.value);
            return;
        }

        const now = Date.now();
        const elapsed = now - lastUpdateTime;

        if (elapsed >= animationSpeed) {
            scrollPosition.value -= scrollSpeed;

            if (scrollPosition.value <= -barSpacing) {
                scrollPosition.value += barSpacing;

                const newBars = [...bars.value];
                newBars.shift();

                analyser.value.getByteFrequencyData(dataArray);

                let voiceValue = 0;
                const voiceRangeStart = Math.floor(bufferLength * 0.05);
                const voiceRangeEnd = Math.floor(bufferLength * 0.25);

                for (let i = voiceRangeStart; i < voiceRangeEnd; i++) {
                    voiceValue += dataArray[i];
                }

                voiceValue = voiceValue / (voiceRangeEnd - voiceRangeStart);

                const barHeight = Math.max(4, Math.min(40, (voiceValue / 255) * 40));

                newBars.push(barHeight);
                bars.value = newBars;
            }

            lastUpdateTime = now;
        }

        animationFrame.value = requestAnimationFrame(animate);
    };

    animationFrame.value = requestAnimationFrame(animate);
};

const simulateRecording = () => {
    if (!props.isRecording) return;

    let lastUpdateTime = Date.now();
    initializeBars();

    const animate = () => {
        if (!props.isRecording) {
            cancelAnimationFrame(animationFrame.value);
            return;
        }

        const now = Date.now();
        const elapsed = now - lastUpdateTime;

        if (elapsed >= animationSpeed) {
            scrollPosition.value -= scrollSpeed;

            if (scrollPosition.value <= -barSpacing) {
                scrollPosition.value += barSpacing;

                const newBars = [...bars.value];
                newBars.shift();

                currentIndex.value = (currentIndex.value + 1) % 100;

                let barHeight = 4;

                if (currentIndex.value % 20 < 15) {
                    const patternPos = currentIndex.value % 20;
                    if (patternPos < 5) {
                        barHeight = 5 + patternPos * 5 + Math.random() * 8;
                    } else if (patternPos < 10) {
                        barHeight = 20 + Math.random() * 20;
                    } else {
                        barHeight = 20 - (patternPos - 10) * 3 + Math.random() * 6;
                    }
                } else {
                    barHeight = 4 + Math.random() * 3;
                }

                newBars.push(barHeight);
                bars.value = newBars;
            }

            lastUpdateTime = now;
        }

        animationFrame.value = requestAnimationFrame(animate);
    };

    animationFrame.value = requestAnimationFrame(animate);
};

const startIdleAnimation = () => {
    initializeBars();

    scrollPosition.value = 0;

    let lastUpdateTime = Date.now();

    const animate = () => {
        if (props.isRecording) {
            cancelAnimationFrame(animationFrame.value);
            return;
        }

        const now = Date.now();
        const elapsed = now - lastUpdateTime;

        if (elapsed >= animationSpeed * 2) {
            scrollPosition.value -= scrollSpeed / 2;

            if (scrollPosition.value <= -barSpacing) {
                scrollPosition.value += barSpacing;

                const newBars = [...bars.value];
                newBars.shift();

                const randomHeight = Math.random();
                let barHeight;

                if (randomHeight > 0.95) {
                    barHeight = 6 + randomHeight * 4;
                } else {
                    barHeight = 2 + randomHeight * 3;
                }

                newBars.push(barHeight);
                bars.value = newBars;
            }

            lastUpdateTime = now;
        }

        animationFrame.value = requestAnimationFrame(animate);
    };

    animationFrame.value = requestAnimationFrame(animate);
};

watch(
    () => props.isRecording,
    (isRecording) => {
        if (animationFrame.value) {
            cancelAnimationFrame(animationFrame.value);
        }

        if (isRecording) {
            currentIndex.value = 0;
            if (props.audioStream) {
                setupAudioAnalysis();
            } else {
                simulateRecording();
            }
        } else {
            startIdleAnimation();
        }
    },
    { immediate: true },
);

onMounted(() => {
    if (containerRef.value) {
        containerWidth.value = containerRef.value.clientWidth - 32;
        calculateVisibleBars();
    }

    initializeBars();

    startIdleAnimation();

    window.addEventListener("resize", updateContainerWidth);
});

const updateContainerWidth = () => {
    if (containerRef.value) {
        containerWidth.value = containerRef.value.clientWidth - 32;
        calculateVisibleBars();
    }
};

onBeforeUnmount(() => {
    if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value);
    }

    if (audioContext.value) {
        audioContext.value.close();
    }

    window.removeEventListener("resize", updateContainerWidth);
});
</script>

<style scoped>
.waveform-container {
    width: 100%;
    height: 80px;
    padding: 0 16px;
    background-color: #f1f5f9;
    border-radius: 12px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.waveform-container.recording {
    background-color: rgba(239, 68, 68, 0.1);
    box-shadow: inset 0 0 8px rgba(239, 68, 68, 0.1);
}

.waveform-scroll-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.waveform-track {
    position: relative;
    width: 100%;
    height: 100%;
}

.center-line {
    position: absolute;
    width: 100%;
    height: 1px;
    background-color: rgba(100, 116, 139, 0.2);
    top: 50%;
    left: 0;
    z-index: 1;
}

.bar-wrapper {
    position: absolute;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 4px;
}

.bar {
    width: 4px;
    border-radius: 0;

    min-height: 2px;

    transition: height 0.1s ease;
}

.bar-top {
    position: absolute;
    bottom: 50%;
    transform-origin: bottom;
    margin-bottom: 1px;
}

.bar-bottom {
    position: absolute;
    top: 50%;
    transform-origin: top;
    margin-top: 1px;
}

.waveform-container:not(.recording) .bar-top,
.waveform-container:not(.recording) .bar-bottom {
    background-color: #3b82f6;
    opacity: 0.8;
}

.recording .bar-top,
.recording .bar-bottom {
    background-color: #ef4444;
    opacity: 0.9;
}

@media (max-width: 640px) {
    .waveform-container {
        height: 60px;
    }

    .bar,
    .bar-wrapper {
        width: 3px;
    }
}

@media (max-width: 480px) {
    .bar,
    .bar-wrapper {
        width: 2px;
    }
}
</style>
