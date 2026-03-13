<template>
    <div class="not-found-container">
        <div class="sakura-petals">
            <span v-for="i in 12" :key="i" class="petal" :style="petalStyle(i)">🌸</span>
        </div>
        <div class="not-found-content">
            <div class="error-code">404</div>
            <div class="sakura-divider">🌸 ✦ 🌸</div>
            <h1 class="error-title">页面不见了</h1>
            <p class="error-desc">
                你寻找的页面已随风飘落，<br />
                或许从未在这里停留过……
            </p>
            <div class="action-buttons">
                <button class="btn-primary" @click="goHome">
                    🏠 回到首页
                </button>
                <button class="btn-secondary" @click="goBack">
                    ← 返回上页
                </button>
            </div>
            <div class="hint-links">
                <router-link to="/editor">✏️ 游戏编辑器</router-link>
                <router-link to="/local">📋 本地游戏</router-link>
                <router-link to="/add">📤 上传游戏</router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
    router.push('/')
}

function goBack() {
    if (window.history.length > 1) {
        router.back()
    } else {
        router.push('/')
    }
}

function petalStyle(i: number) {
    const left = (i * 8.33) % 100
    const delay = (i * 0.4) % 5
    const duration = 4 + (i % 3)
    const size = 0.8 + (i % 3) * 0.3
    return {
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}rem`,
        opacity: 0.6 + (i % 4) * 0.1,
    }
}
</script>

<style scoped>
.not-found-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #fff0f5 0%, #ffe4ef 50%, #ffd6e7 100%);
    position: relative;
    overflow: hidden;
    padding: 2rem;
}

/* 飘落花瓣 */
.sakura-petals {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.petal {
    position: absolute;
    top: -60px;
    animation: falling linear infinite;
    user-select: none;
}

@keyframes falling {
    0% {
        transform: translateY(0) rotate(0deg) translateX(0);
        opacity: 0.8;
    }

    25% {
        transform: translateY(25vh) rotate(90deg) translateX(20px);
    }

    50% {
        transform: translateY(50vh) rotate(180deg) translateX(-15px);
    }

    75% {
        transform: translateY(75vh) rotate(270deg) translateX(10px);
    }

    100% {
        transform: translateY(110vh) rotate(360deg) translateX(-5px);
        opacity: 0;
    }
}

/* 主内容 */
.not-found-content {
    position: relative;
    z-index: 1;
    text-align: center;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 182, 193, 0.5);
    border-radius: 24px;
    padding: 3rem 4rem;
    max-width: 520px;
    width: 100%;
    box-shadow:
        0 8px 32px rgba(255, 105, 135, 0.12),
        0 2px 8px rgba(255, 105, 135, 0.08);
}

.error-code {
    font-size: 7rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #ff6b9d, #ff9ebf, #ffb7d1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -4px;
    margin-bottom: 0.5rem;
    text-shadow: none;
    filter: drop-shadow(0 4px 12px rgba(255, 105, 135, 0.3));
}

.sakura-divider {
    font-size: 1.2rem;
    color: #ffb7d1;
    margin: 0.5rem 0 1rem;
    letter-spacing: 0.5rem;
}

.error-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #c25272;
    margin: 0 0 1rem;
}

.error-desc {
    color: #a06070;
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 2rem;
}

/* 按钮组 */
.action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
}

.btn-primary {
    background: linear-gradient(135deg, #ff6b9d, #ff9ebf);
    color: white;
    border: none;
    padding: 0.7rem 1.8rem;
    border-radius: 50px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 4px 15px rgba(255, 107, 157, 0.35);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 157, 0.45);
}

.btn-secondary {
    background: white;
    color: #c25272;
    border: 2px solid #ffb7d1;
    padding: 0.7rem 1.8rem;
    border-radius: 50px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
}

.btn-secondary:hover {
    background: #fff0f5;
    border-color: #ff9ebf;
    transform: translateY(-2px);
}

/* 快捷链接 */
.hint-links {
    display: flex;
    gap: 1.2rem;
    justify-content: center;
    flex-wrap: wrap;
}

.hint-links a {
    color: #e07090;
    text-decoration: none;
    font-size: 0.88rem;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    background: rgba(255, 182, 193, 0.15);
    transition: all 0.2s;
}

.hint-links a:hover {
    background: rgba(255, 182, 193, 0.35);
    color: #c25272;
}

@media (max-width: 480px) {
    .not-found-content {
        padding: 2rem 1.5rem;
    }

    .error-code {
        font-size: 5rem;
    }

    .action-buttons {
        flex-direction: column;
        align-items: center;
    }
}
</style>