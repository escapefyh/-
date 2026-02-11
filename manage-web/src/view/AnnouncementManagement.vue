<template>
  <div class="announcement-management">
    <el-row :gutter="20">
      <!-- 发布公告 -->
      <el-col :xs="24" :md="10">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>发布系统公告</span>
            </div>
          </template>

          <el-form :model="form" label-width="80px">
            <el-form-item label="标题" required>
              <el-input
                v-model="form.title"
                placeholder="请输入公告标题（最多100字）"
                maxlength="100"
                show-word-limit
                clearable
              />
            </el-form-item>
            <el-form-item label="内容" required>
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="8"
                placeholder="请输入公告内容"
                maxlength="5000"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="publishing" @click="handlePublish">
                发布
              </el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 公告列表 -->
      <el-col :xs="24" :md="14">
        <el-card>
          <template #header>
            <div class="card-header list-header">
              <span>公告列表</span>
              <el-button type="primary" plain :loading="loading" @click="fetchList">
                刷新
              </el-button>
            </div>
          </template>

          <el-table v-loading="loading" :data="list" stripe style="width: 100%">
            <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
            <el-table-column prop="admin_name" label="发布者" width="120">
              <template #default="{ row }">
                {{ row.admin_name || '管理员' }}
              </template>
            </el-table-column>
            <el-table-column prop="create_time" label="发布时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.create_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="info" @click="handleView(row)">查看</el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 查看公告 -->
    <el-dialog v-model="detailVisible" title="公告详情" width="700px">
      <div v-if="detail">
        <div class="detail-title">{{ detail.title }}</div>
        <div class="detail-meta">
          <span>发布者：{{ detail.admin_name || '管理员' }}</span>
          <span style="margin-left: 16px">时间：{{ formatDateTime(detail.create_time) }}</span>
        </div>
        <el-divider />
        <div class="detail-content">{{ detail.content }}</div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminAnnouncementAPI } from '../utils/api'

const form = ref({
  title: '',
  content: ''
})

const publishing = ref(false)
const loading = ref(false)

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const detailVisible = ref(false)
const detail = ref(null)

const formatDateTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await adminAnnouncementAPI.getAnnouncementList({
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.msg === 'success') {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.error || '获取公告列表失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handlePublish = async () => {
  const title = form.value.title?.trim()
  const content = form.value.content?.trim()
  if (!title) return ElMessage.warning('请输入标题')
  if (!content) return ElMessage.warning('请输入内容')

  publishing.value = true
  try {
    const adminInfoStr = localStorage.getItem('admin_info')
    const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
    const res = await adminAnnouncementAPI.createAnnouncement({
      title,
      content,
      admin_id: adminInfo?.admin_id || ''
    })
    if (res.msg === 'success') {
      ElMessage.success('发布成功')
      handleReset()
      page.value = 1
      await fetchList()
    } else {
      ElMessage.error(res.error || '发布失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    publishing.value = false
  }
}

const handleReset = () => {
  form.value.title = ''
  form.value.content = ''
}

const handleView = async (row) => {
  try {
    const res = await adminAnnouncementAPI.getAnnouncementDetail(row.announcement_id)
    if (res.msg === 'success') {
      detail.value = res.data
      detailVisible.value = true
    } else {
      ElMessage.error(res.error || '获取详情失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该公告吗？删除后所有用户都将不可见。', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    const res = await adminAnnouncementAPI.deleteAnnouncement(row.announcement_id)
    if (res.msg === 'success') {
      ElMessage.success('删除成功')
      await fetchList()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (e) {
    // 取消删除不提示
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  fetchList()
}

const handlePageChange = (val) => {
  page.value = val
  fetchList()
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.announcement-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-header {
  gap: 12px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #303133;
}

.detail-meta {
  color: #909399;
  font-size: 13px;
}

.detail-content {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #303133;
}
</style>







