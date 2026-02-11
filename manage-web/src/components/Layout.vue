<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <span v-if="!isCollapse">管理系统</span>
        <span v-else>管理</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/user-management">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/goods-management">
          <el-icon><Goods /></el-icon>
          <template #title>热度控制</template>
        </el-menu-item>
        <el-menu-item index="/product-management">
          <el-icon><Goods /></el-icon>
          <template #title>商品管理</template>
        </el-menu-item>
        <el-menu-item index="/announcement-management">
          <el-icon><Bell /></el-icon>
          <template #title>系统公告</template>
        </el-menu-item>
        <el-menu-item index="/sensitive-word-management">
          <el-icon><Edit /></el-icon>
          <template #title>敏感词过滤</template>
        </el-menu-item>
        <el-menu-item index="/feedback-management">
          <el-icon><Message /></el-icon>
          <template #title>问题反馈</template>
        </el-menu-item>
        <el-sub-menu index="/analytics">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>数据可视化</span>
          </template>
          <el-menu-item index="/analytics/traffic">
            <el-icon><TrendCharts /></el-icon>
            <template #title>流量与热度分析</template>
          </el-menu-item>
          <el-menu-item index="/analytics/transaction">
            <el-icon><TrendCharts /></el-icon>
            <template #title>交易与拼单分析</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-icon" @click="toggleCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><Avatar /></el-icon>
              <span>{{ adminInfo?.name || '管理员' }}</span>
              <el-icon class="el-icon--right"><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Expand, Fold, Avatar, CaretBottom, DataAnalysis, TrendCharts, Goods, Bell, Edit, Message } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const isCollapse = ref(false)
const adminInfo = ref(null)

const activeMenu = computed(() => {
  return route.path
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('admin_info')
    localStorage.removeItem('admin_token')
    router.push('/login')
  }
}

onMounted(() => {
  const adminInfoStr = localStorage.getItem('admin_info')
  if (adminInfoStr) {
    adminInfo.value = JSON.parse(adminInfoStr)
  } else {
    router.push('/login')
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background-color: #2b3a4a;
}

.sidebar-menu {
  border-right: none;
  background-color: #304156;
}

.sidebar-menu .el-menu-item {
  color: #bfcbd9;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #263445;
  color: #409eff;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #409eff;
  color: #fff;
}

/* Element Plus 菜单深层节点需要用 :deep 才能在 scoped 下生效 */
:deep(.sidebar-menu) {
  background-color: #304156;
}

/* 子菜单标题（数据可视化） */
:deep(.sidebar-menu .el-sub-menu__title) {
  color: #d0d7e2;
  height: 48px;
  line-height: 48px;
}

:deep(.sidebar-menu .el-sub-menu__title:hover) {
  background-color: #263445;
  color: #409eff;
}

/* 展开后的子菜单容器背景（避免默认白底/浅底导致“看不清”） */
:deep(.sidebar-menu .el-menu) {
  background-color: #2b3a4a;
}

/* 子菜单项样式 */
:deep(.sidebar-menu .el-menu .el-menu-item) {
  color: #c7d1de;
  height: 44px;
  line-height: 44px;
}

:deep(.sidebar-menu .el-menu .el-menu-item:hover) {
  background-color: #233141;
  color: #409eff;
}

:deep(.sidebar-menu .el-menu .el-menu-item.is-active) {
  background-color: rgba(64, 158, 255, 0.18);
  color: #fff;
}

/* 图标跟随文字颜色 */
:deep(.sidebar-menu .el-icon) {
  color: inherit;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.collapse-icon:hover {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #606266;
}

.user-info:hover {
  color: #409eff;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>

