<template>
  <div class="register-container">
    <div class="register-box">
      <h2 class="register-title">管理员注册</h2>
      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="account">账号</label>
          <input
            id="account"
            v-model="form.account"
            type="text"
            placeholder="请输入账号（6-20个字符）"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="name">姓名</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="请输入姓名"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="phone">手机号</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="请输入手机号"
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
            placeholder="请输入密码（6-20个字符）"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
            class="form-input"
          />
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        <div class="form-footer">
          <span>已有账号？</span>
          <router-link to="/login" class="link">立即登录</router-link>
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
  name: '',
  phone: '',
  password: '',
  confirmPassword: ''
});

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const validateForm = () => {
  errorMessage.value = '';
  
  if (form.value.account.length < 6 || form.value.account.length > 20) {
    errorMessage.value = '账号长度应在6-20个字符之间';
    return false;
  }
  
  if (form.value.password.length < 6 || form.value.password.length > 20) {
    errorMessage.value = '密码长度应在6-20个字符之间';
    return false;
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致';
    return false;
  }
  
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!phonePattern.test(form.value.phone)) {
    errorMessage.value = '请输入正确的手机号格式';
    return false;
  }
  
  return true;
};

const handleRegister = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  
  if (!validateForm()) {
    return;
  }
  
  loading.value = true;

  try {
    const response = await adminAuthAPI.register(
      form.value.account,
      form.value.name,
      form.value.phone,
      form.value.password
    );
    
    if (response.msg === 'success') {
      successMessage.value = '注册成功！正在跳转到登录页面...';
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else if (response.msg === 'registered') {
      errorMessage.value = response.error || '该账号已注册';
    } else {
      errorMessage.value = response.error || '注册失败，请稍后重试';
    }
  } catch (error) {
    console.error('注册错误:', error);
    errorMessage.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.register-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.register-form {
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

.success-message {
  color: #27ae60;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #efe;
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











