<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const API_URL = '/api';

const stats = ref({ uniqueVisitors: 0, totalUsers: 0 });
const leaderboard = ref([]);
const loading = ref(true);
const error = ref(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [statsRes, leaderboardRes] = await Promise.all([
      fetch(`${API_URL}/stats`),
      fetch(`${API_URL}/leaderboard`)
    ]);
    
    if (!statsRes.ok || !leaderboardRes.ok) {
      throw new Error('Failed to fetch data');
    }
    
    stats.value = await statsRes.json();
    leaderboard.value = await leaderboardRes.json();
  } catch (e) {
    error.value = 'Server bağlantısı kurulamadı. Server çalışıyor mu?';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);

const goHome = () => router.push('/');
</script>

<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
    
    <!-- Header -->
    <header class="w-full px-4 py-4 flex justify-between items-center border-b border-white/5">
      <div class="flex items-center gap-2 cursor-pointer" @click="goHome">
        <span class="text-2xl">🧠</span>
        <span class="text-lg font-bold text-white">Brainrot Quiz</span>
      </div>
      <div class="px-3 py-1 bg-violet-500/20 border border-violet-500/50 rounded-lg">
        <span class="text-sm font-medium text-violet-400">Stats</span>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto p-6">
      
      <button 
        @click="goHome" 
        class="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Back to Quiz</span>
      </button>

      <h1 class="text-3xl font-bold text-white mb-8">📊 Leaderboard</h1>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="text-4xl mb-4">⏳</div>
        <p class="text-slate-400">Loading...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <div class="text-4xl mb-4">⚠️</div>
        <p class="text-red-400 mb-4">{{ error }}</p>
        <p class="text-slate-500 text-sm">Start the server: cd server && npm start</p>
        <button @click="fetchData" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500">
          Try Again
        </button>
      </div>

      <!-- Data -->
      <div v-else>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <p class="text-sm text-slate-400 uppercase tracking-wider mb-1">Unique Visitors</p>
            <p class="text-4xl font-black text-white">{{ stats.uniqueVisitors }}</p>
          </div>
          <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <p class="text-sm text-slate-400 uppercase tracking-wider mb-1">Registered Users</p>
            <p class="text-4xl font-black text-white">{{ stats.totalUsers }}</p>
          </div>
          <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <p class="text-sm text-slate-400 uppercase tracking-wider mb-1">Highest Score</p>
            <p class="text-4xl font-black text-amber-400">{{ leaderboard[0]?.highScore || 0 }}</p>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/50">
            <h2 class="text-xl font-bold text-white">🏆 Top Players</h2>
          </div>
          
          <div v-if="leaderboard.length === 0" class="p-6 text-center text-slate-500">
            No registered users yet.
          </div>
          
          <table v-else class="w-full">
            <thead>
              <tr class="text-left text-sm text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-3">#</th>
                <th class="px-6 py-3">Name</th>
                <th class="px-6 py-3">High Score</th>
                <th class="px-6 py-3">Last Played</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(user, index) in leaderboard" 
                :key="user.name"
                class="border-t border-slate-700/50 hover:bg-slate-700/30"
              >
                <td class="px-6 py-4">
                  <span v-if="index === 0" class="text-2xl">🥇</span>
                  <span v-else-if="index === 1" class="text-2xl">🥈</span>
                  <span v-else-if="index === 2" class="text-2xl">🥉</span>
                  <span v-else class="text-slate-500">{{ index + 1 }}</span>
                </td>
                <td class="px-6 py-4 font-medium text-white">{{ user.name }}</td>
                <td class="px-6 py-4 text-amber-400 font-bold">{{ user.highScore }}</td>
                <td class="px-6 py-4 text-slate-500 text-sm">
                  {{ user.lastPlayed ? new Date(user.lastPlayed).toLocaleDateString('tr-TR') : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </main>

  </div>
</template>
