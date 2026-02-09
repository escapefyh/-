import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../view/Login.vue')
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../view/Register.vue')
    },
    {
      path: '/',
      component: () => import('../components/Layout.vue'),
      redirect: '/user-management',
      children: [
        {
          path: '/user-management',
          name: 'UserManagement',
          component: () => import('../view/UserManagement.vue')
        },
        {
          path: '/user-detail/:user_id',
          name: 'UserDetail',
          component: () => import('../view/UserDetail.vue')
        },
        {
          path: '/user-orders/:user_id',
          name: 'UserOrders',
          component: () => import('../view/UserOrders.vue')
        },
        {
          path: '/analytics/traffic',
          name: 'TrafficAnalysis',
          component: () => import('../view/analytics/TrafficAnalysis.vue')
        },
        {
          path: '/analytics/transaction',
          name: 'TransactionAnalysis',
          component: () => import('../view/analytics/TransactionAnalysis.vue')
        }
      ]
    }
  ],
})

// 路由守卫：检查登录状态
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  const isLoginPage = to.path === '/login' || to.path === '/register'
  
  if (!token && !isLoginPage) {
    next('/login')
  } else if (token && isLoginPage) {
    next('/')
  } else {
    next()
  }
})

export default router
