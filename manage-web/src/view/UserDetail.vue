<template>
  <div class="user-detail">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button type="primary" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span>用户详情</span>
        </div>
      </template>

      <div v-loading="loading" class="detail-content">
        <el-descriptions :column="2" border v-if="userInfo">
          <el-descriptions-item label="用户ID">
            {{ userInfo.user_id }}
          </el-descriptions-item>
          <el-descriptions-item label="账号">
            {{ userInfo.account }}
          </el-descriptions-item>
          <el-descriptions-item label="昵称">
            {{ userInfo.nickname || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="姓名">
            {{ userInfo.name || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ userInfo.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ userInfo.create_time }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="userInfo.is_blacklisted === 1 ? 'danger' : 'success'">
              {{ userInfo.is_blacklisted === 1 ? '已拉黑' : '正常' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="头像">
            <el-image
              v-if="userInfo && userInfo.avatar"
              :src="getImageProxyUrl(userInfo.avatar)"
              style="width: 60px; height: 60px; border-radius: 50%"
              fit="cover"
              :preview-src-list="userInfo.avatar ? [getImageProxyUrl(userInfo.avatar)] : []"
              preview-teleported
              loading="lazy"
              @error="handleImageError"
              @load="handleImageLoad"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <span v-else>未设置</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import { adminUserAPI, getImageProxyUrl } from '../utils/api'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const userInfo = ref(null)

const fetchUserDetail = async () => {
  const user_id = route.params.user_id
  if (!user_id) {
    ElMessage.error('用户ID不能为空')
    router.back()
    return
  }

  loading.value = true
  try {
    const response = await adminUserAPI.getUserDetail(user_id)
    
    if (response.msg === 'success') {
      userInfo.value = response.data
      // 调试：打印头像URL
      console.log('用户头像URL:', response.data.avatar)
    } else {
      ElMessage.error(response.error || '获取用户详情失败')
      router.back()
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error('网络错误，请稍后重试')
    router.back()
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const handleImageError = (e) => {
  console.error('图片加载失败:', {
    src: e.target?.src || userInfo.value?.avatar,
    error: e
  })
  ElMessage.warning('头像加载失败，请检查图片URL')
}

const handleImageLoad = (e) => {
  console.log('图片加载成功:', e.target?.src)
}

onMounted(() => {
  fetchUserDetail()
})
</script>

<style scoped>
.user-detail {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-content {
  padding: 20px 0;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
}
</style>

