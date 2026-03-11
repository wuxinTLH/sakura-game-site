<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="logo">
          <span class="logo-icon">🌸</span>
          <span class="logo-text">
            <span class="logo-main">桜游戏屋</span>
            <span class="logo-sub">SAKURA GAMES</span>
          </span>
        </router-link>
        <nav class="header-nav">
          <router-link to="/" class="nav-link" active-class="active">
            全部游戏
          </router-link>
          <router-link to="/local" class="nav-link" active-class="active">
            💾 本地游戏
          </router-link>
          <router-link to="/add" class="nav-link" active-class="active">
            📤 上传游戏
          </router-link>
          <router-link to="/editor" class="nav-link nav-link-editor" active-class="active">
            ✏️ 编辑器
          </router-link>
        </nav>
      </div>
      <div class="header-petal-strip" aria-hidden="true">
        <span v-for="i in 12" :key="i">🌸</span>
      </div>
    </header>

    <main class="site-main">
      <router-view />
    </main>

    <footer class="site-footer">
      <p>🌸 桜游戏屋 &nbsp;·&nbsp; 用爱制作的小游戏合集</p>
      <p class="footer-powered">
        Powered by <span class="powered-name">SakuraMikku</span>
        &nbsp;·&nbsp;

        <a href="https://github.com/wuxinTLH" target="_blank" rel="noopener noreferrer" class="footer-github">
          <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482
          0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463
          -.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832
          .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683
          -.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59
          0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699
          1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336
          -.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          GitHub
        </a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.site-main {
  flex: 1;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 248, 251, 0.88);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 16px rgba(196, 77, 117, 0.08);
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-link-editor {
  background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
  color: #fff !important;
  padding: 6px 16px;
}

.nav-link-editor:hover {
  opacity: 0.88;
  background: linear-gradient(135deg, var(--sakura-500), var(--sakura-600));
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  transition: opacity var(--transition);
}

.logo:hover {
  opacity: 0.8;
}

.logo-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.logo-main {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--sakura-600);
  letter-spacing: 1px;
}

.logo-sub {
  font-size: 0.6rem;
  letter-spacing: 3px;
  color: var(--ink-400);
  font-weight: 500;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink-600);
  transition: all var(--transition);
}

.nav-link:hover,
.nav-link.active {
  background: var(--sakura-100);
  color: var(--sakura-600);
}

.header-petal-strip {
  display: flex;
  justify-content: space-around;
  padding: 2px 0;
  background: linear-gradient(90deg, var(--sakura-200), var(--sakura-300), var(--sakura-200));
  font-size: 0.55rem;
  opacity: 0.7;
  overflow: hidden;
}

.site-footer {
  padding: 24px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--ink-400);
  border-top: 1px solid var(--border);
  background: var(--sakura-100);
}

.footer-powered {
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--ink-200);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.powered-name {
  color: var(--sakura-500);
  font-weight: 600;
}

.footer-github {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-400);
  font-weight: 500;
  transition: color var(--transition);
}

.footer-github:hover {
  color: var(--sakura-500);
}

.github-icon {
  width: 14px;
  height: 14px;
}
</style>