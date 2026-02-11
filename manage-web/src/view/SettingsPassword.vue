<template>
  <div class="settings-page">
    <h2 class="page-title">设置 / 修改密码</h2>

    <el-card class="section-card">
      <template #header>
        <span>修改密码</span>
      </template>
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        status-icon
      >
        <el-form-item label="原密码" prop="old_password">
          <el-input
            v-model="passwordForm.old_password"
            type="password"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
          <el-input
            v-model="passwordForm.new_password"
            type="password"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirm_password">
          <el-input
            v-model="passwordForm.confirm_password"
            type="password"
            show-password
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">
            确认修改
          </el-button>
          <el-button @click="handleResetPasswordForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminSettingsAPI } from '../utils/api'

const router = useRouter()

// 修改密码表单
const passwordFormRef = ref(null)
const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.new_password) {
    callback(new Error('两次输入的新密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应在6-20个字符之间', trigger: 'blur' }
  ],
  confirm_password: [
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const changingPassword = ref(false)

const handleChangePassword = () => {
  if (!passwordFormRef.value) return
  passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      changingPassword.value = true
      const adminInfoStr = localStorage.getItem('admin_info')
      const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
      if (!adminInfo || !adminInfo.admin_id) {
        ElMessage.error('管理员信息缺失，请重新登录')
        router.push('/login')
        return
      }

      const res = await adminSettingsAPI.changePassword({
        admin_id: adminInfo.admin_id,
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      })

      if (res.msg === 'success') {
        ElMessage.success('密码修改成功，请重新登录')
        // 清除本地登录状态
        localStorage.removeItem('admin_info')
        localStorage.removeItem('admin_token')
        router.push('/login')
      } else {
        ElMessage.error(res.error || '密码修改失败')
      }
    } catch (e) {
      console.error('修改密码失败:', e)
      ElMessage.error('网络错误，请稍后重试')
    } finally {
      changingPassword.value = false
    }
  })
}

const handleResetPasswordForm = () => {
  passwordForm.old_password = ''
  passwordForm.new_password = ''
  passwordForm.confirm_password = ''
  if (passwordFormRef.value) {
    passwordFormRef.value.clearValidate()
  }
}
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 20px;
}
</style>


