<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="login-title">管理员登录</h2>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="account">账号</label>
          <input
            id="account"
            v-model="form.account"
            type="text"
            placeholder="请输入账号"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            required
            class="form-input"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <div class="form-footer">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminAuthAPI } from '../utils/api';

const router = useRouter();

const form = ref({
  account: '',
  password: ''
});

const loading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true;

  try {
    const response = await adminAuthAPI.login(form.value.account, form.value.password);
    
    if (response.msg === 'success') {
      // 保存管理员信息到 localStorage
      localStorage.setItem('admin_info', JSON.stringify(response.data));
      localStorage.setItem('admin_token', response.data.admin_id);
      
      // 跳转到首页或管理页面
      router.push('/');
    } else if (response.msg === 'accountError') {
      errorMessage.value = response.error || '账号或密码错误';
    } else {
      errorMessage.value = response.error || '登录失败，请稍后重试';
    }
  } catch (error) {
    console.error('登录错误:', error);
    errorMessage.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #fee;
  border-radius: 6px;
}

.submit-btn {
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.3s;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.link {
  color: #667eea;
  text-decoration: none;
  margin-left: 5px;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>











