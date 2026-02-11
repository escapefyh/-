<template>
  <div class="sensitive-word-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>敏感词过滤</span>
          <div class="header-right">
            <el-input
              v-model="keyword"
              placeholder="搜索敏感词"
              style="width: 240px"
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" :icon="Plus" style="margin-left: 10px" @click="showCreateDialog = true">
              新增敏感词
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="list"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="word" label="敏感词" min-width="160" />
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
        <el-table-column prop="create_time" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增敏感词 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新增敏感词"
      width="480px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="敏感词" required>
          <el-input
            v-model="form.word"
            placeholder="请输入敏感词（例如：暴力、黄牛等）"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="可选，用于说明该敏感词的用途"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { adminSensitiveWordAPI } from '../utils/api'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

const showCreateDialog = ref(false)
const creating = ref(false)
const form = ref({
  word: '',
  remark: ''
})

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
    const res = await adminSensitiveWordAPI.getWordList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value
    })
    if (res.msg === 'success') {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.error || '获取敏感词列表失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
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

const resetForm = () => {
  form.value.word = ''
  form.value.remark = ''
}

const handleCreate = async () => {
  const word = form.value.word?.trim()
  if (!word) {
    ElMessage.warning('请输入敏感词')
    return
  }
  if (word.length > 50) {
    ElMessage.warning('敏感词长度不能超过50个字符')
    return
  }

  creating.value = true
  try {
    const res = await adminSensitiveWordAPI.createWord({
      word,
      remark: form.value.remark?.trim() || ''
    })
    if (res.msg === 'success') {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      resetForm()
      page.value = 1
      fetchList()
    } else {
      ElMessage.error(res.error || '创建失败')
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('网络错误，请稍后重试')
  } finally {
    creating.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除敏感词「${row.word}」吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    const res = await adminSensitiveWordAPI.deleteWord(row._id)
    if (res.msg === 'success') {
      ElMessage.success('删除成功')
      fetchList()
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch (e) {
    // 用户取消不提示错误
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.sensitive-word-management {
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
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>





