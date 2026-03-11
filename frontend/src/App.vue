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
</style>