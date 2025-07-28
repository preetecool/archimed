<template>
    <div class="ecg-container">
        <svg viewBox="0 0 2000 120" class="ecg-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
                <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stop-color="var(--accent-color, #41e6c0)" stop-opacity="1" />
                    <stop
                        offset="40%"
                        stop-color="var(--accent-color, #41e6c0)"
                        stop-opacity="0.8"
                    />
                    <stop
                        offset="100%"
                        stop-color="var(--accent-color, #41e6c0)"
                        stop-opacity="0"
                    />
                </radialGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                <path
                    id="ecgPath"
                    d="M 0,60
                             Q 40,60 50,60
                             T 100,60
                             L 120,60
                             L 130,30
                             L 140,90
                             L 150,40
                             L 160,80
                             L 180,60
                             L 220,60
                             Q 260,60 280,60
                             T 340,60
                             L 360,60
                             L 370,30
                             L 380,90
                             L 390,40
                             L 400,80
                             L 420,60
                             L 460,60
                             Q 500,60 520,60
                             T 580,60
                             L 600,60
                             L 610,30
                             L 620,90
                             L 630,40
                             L 640,80
                             L 660,60
                             L 700,60
                             Q 740,60 760,60
                             T 820,60
                             L 840,60
                             L 850,30
                             L 860,90
                             L 870,40
                             L 880,80
                             L 900,60
                             L 940,60
                             Q 980,60 1000,60
                             T 1060,60
                             L 1080,60
                             L 1090,30
                             L 1100,90
                             L 1110,40
                             L 1120,80
                             L 1140,60
                             L 1180,60
                             Q 1220,60 1240,60
                             T 1300,60
                             L 1320,60
                             L 1330,30
                             L 1340,90
                             L 1350,40
                             L 1360,80
                             L 1380,60
                             L 1420,60
                             Q 1460,60 1480,60
                             T 1540,60
                             L 1560,60
                             L 1570,30
                             L 1580,90
                             L 1590,40
                             L 1600,80
                             L 1620,60
                             L 1660,60
                             Q 1700,60 1720,60
                             T 1780,60
                             L 1800,60
                             L 1810,30
                             L 1820,90
                             L 1830,40
                             L 1840,80
                             L 1860,60
                             L 2000,60"
                    stroke="var(--border-color)"
                    stroke-width="1.5"
                    fill="none"
                    filter="url(#glow)"
                />
            </defs>

            <use href="#ecgPath" stroke="#808080" stroke-width="1.5" fill="none" />

            <circle
                r="6"
                fill="url(#glowGradient)"
                filter="drop-shadow(0 0 8px var(--accent-color)"
                class="pulse-dot"
            >
                <animateMotion
                    dur="12s"
                    repeatCount="indefinite"
                    path="M 0,60
                Q 40,60 50,60
                T 100,60
                L 120,60
                L 130,30
                L 140,90
                L 150,40
                L 160,80
                L 180,60
                L 220,60
                Q 260,60 280,60
                T 340,60
                L 360,60
                L 370,30
                L 380,90
                L 390,40
                L 400,80
                L 420,60
                L 460,60
                Q 500,60 520,60
                T 580,60
                L 600,60
                L 610,30
                L 620,90
                L 630,40
                L 640,80
                L 660,60
                L 700,60
                Q 740,60 760,60
                T 820,60
                L 840,60
                L 850,30
                L 860,90
                L 870,40
                L 880,80
                L 900,60
                L 940,60
                Q 980,60 1000,60
                T 1060,60
                L 1080,60
                L 1090,30
                L 1100,90
                L 1110,40
                L 1120,80
                L 1140,60
                L 1180,60
                Q 1220,60 1240,60
                T 1300,60
                L 1320,60
                L 1330,30
                L 1340,90
                L 1350,40
                L 1360,80
                L 1380,60
                L 1420,60
                Q 1460,60 1480,60
                T 1540,60
                L 1560,60
                L 1570,30
                L 1580,90
                L 1590,40
                L 1600,80
                L 1620,60
                L 1660,60
                Q 1700,60 1720,60
                T 1780,60
                L 1800,60
                L 1810,30
                L 1820,90
                L 1830,40
                L 1840,80
                L 1860,60
                L 2000,60"
                />
            </circle>
        </svg>
    </div>
</template>

<script setup></script>

<style scoped>
.ecg-container {
    width: 100vw;
    margin: 0 auto;
    height: 120px;
    position: relative;
    overflow: visible;
}

.ecg-svg {
    width: 100%;
    height: 100%;
}

@media (max-width: 768px) {
    .ecg-container {
        height: 60px;
    }
}
</style>
