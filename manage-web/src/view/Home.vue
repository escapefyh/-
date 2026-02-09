<template>
  <div class="home-container">
    <div class="header">
      <h1>后台管理系统</h1>
      <div class="user-info">
        <span v-if="adminInfo">{{ adminInfo.name }}</span>
        <button @click="handleLogout" class="logout-btn">退出登录</button>
      </div>
    </div>
    <div class="content">
      <div class="welcome-card">
        <h2>欢迎使用后台管理系统</h2>
        <p>您已成功登录</p>
        <div v-if="adminInfo" class="info-card">
          <p><strong>账号：</strong>{{ adminInfo.account }}</p>
          <p><strong>姓名：</strong>{{ adminInfo.name }}</p>
          <p><strong>手机号：</strong>{{ adminInfo.phone }}</p>
          <p><strong>角色：</strong>{{ adminInfo.role === 'admin' ? '管理员' : '超级管理员' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const adminInfo = ref(null);

onMounted(() => {
  const adminInfoStr = localStorage.getItem('admin_info');
  if (adminInfoStr) {
    adminInfo.value = JSON.parse(adminInfoStr);
  } else {
    // 如果没有登录信息，跳转到登录页
    router.push('/login');
  }
});

const handleLogout = () => {
  localStorage.removeItem('admin_info');
  localStorage.removeItem('admin_token');
  router.push('/login');
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 20px 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info span {
  color: #666;
  font-size: 14px;
}

.logout-btn {
  padding: 8px 16px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: #c0392b;
}

.content {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-card h2 {
  color: #333;
  margin-bottom: 10px;
}

.welcome-card p {
  color: #666;
  margin-bottom: 30px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  text-align: left;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.info-card p {
  margin: 10px 0;
  color: #333;
}
</style>


