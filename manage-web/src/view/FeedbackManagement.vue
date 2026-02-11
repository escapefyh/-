<template>
  <div class="feedback-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>问题反馈</span>
          <div class="header-right">
            <el-radio-group v-model="status" size="small" @change="handleStatusChange">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="pending">待处理</el-radio-button>
              <el-radio-button label="resolved">已解决</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="list"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="user_id" label="用户ID" width="160" show-overflow-tooltip />
        <el-table-column prop="content" label="问题描述" min-width="260" show-overflow-tooltip />
        <el-table-column label="图片" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.images && row.images.length"
              :src="row.images[0]"
              :preview-src-list="row.images"
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 4px"
            />
            <span v-else style="color:#999;">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'resolved' ? 'success' : 'warning'">
              {{ row.status === 'resolved' ? '已解决' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="reply_time" label="回复时间" width="180">
          <template #default="{ row }">
            {{ row.reply_time ? formatDateTime(row.reply_time) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="info" @click="handleView(row)">查看</el-button>
            <el-button
              size="small"
              type="primary"
              @click="handleReply(row)"
            >
              回复
            </el-button>
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

    <!-- 查看详情弹窗 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="700px">
      <div v-if="current">
        <div class="detail-block">
          <div class="detail-label">用户ID：</div>
          <div class="detail-value">{{ current.user_id }}</div>
        </div>
        <div class="detail-block">
          <div class="detail-label">问题描述：</div>
          <div class="detail-value">{{ current.content }}</div>
        </div>
        <div class="detail-block" v-if="current.images && current.images.length">
          <div class="detail-label">图片：</div>
          <div class="detail-value">
            <el-image
              v-for="(img, idx) in current.images"
              :key="idx"
              :src="img"
              :preview-src-list="current.images"
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 4px; margin-right: 10px"
            />
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-label">状态：</div>
          <div class="detail-value">
            <el-tag :type="current.status === 'resolved' ? 'success' : 'warning'">
              {{ current.status === 'resolved' ? '已解决' : '待处理' }}
            </el-tag>
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-label">管理员回复：</div>
          <div class="detail-value">
            {{ current.admin_reply || '暂无回复' }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 回复弹窗 -->
    <el-dialog v-model="replyVisible" title="回复问题反馈" width="600px">
      <div v-if="current">
        <p style="margin-bottom:8px;"><strong>用户问题：</strong>{{ current.content }}</p>
        <el-input
          v-model="replyContent"
          type="textarea"
          :rows="6"
          placeholder="请输入回复内容（用户将在系统公告中看到这条回复）"
          maxlength="1000"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="replying" @click="submitReply">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { adminFeedbackAPI } from '../utils/api'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const status = ref('pending') // 默认筛选待处理

const detailVisible = ref(false)
const replyVisible = ref(false)
const current = ref(null)
const replyContent = ref('')
const replying = ref(false)

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
    const res = await adminFeedbackAPI.getFeedbackList({
      page: page.value,
      pageSize: pageSize.value,
      status: status.value
    })
    if (res.msg === 'success') {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.error || '获取反馈列表失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleStatusChange = () => {
  page.value = 1
  fetchList()
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

const handleView = (row) => {
  current.value = row
  detailVisible.value = true
}

const handleReply = (row) => {
  current.value = row
  replyContent.value = row.admin_reply || ''
  replyVisible.value = true
}

const submitReply = async () => {
  if (!current.value) return
  const content = replyContent.value?.trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }

  replying.value = true
  try {
    const adminInfoStr = localStorage.getItem('admin_info')
    const adminInfo = adminInfoStr ? JSON.parse(adminInfoStr) : null
    const res = await adminFeedbackAPI.replyFeedback({
      feedback_id: current.value._id,
      reply_content: content,
      admin_id: adminInfo?.admin_id || ''
    })
    if (res.msg === 'success') {
      ElMessage.success('回复已发送')
      replyVisible.value = false
      fetchList()
    } else {
      ElMessage.error(res.error || '回复失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    replying.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.feedback-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.detail-block {
  margin-bottom: 10px;
  display: flex;
}

.detail-label {
  width: 90px;
  color: #909399;
  font-size: 14px;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>



