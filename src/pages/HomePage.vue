<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import charactersData from '../data/characters.json';

const router = useRouter();
const API_URL = 'http://localhost:3001/api';

const parsePopularity = (popStr) => {
  if (!popStr) return 0;
  let num = parseFloat(popStr.replace(/[^0-9.]/g, ''));
  if (popStr.toUpperCase().includes('M')) num *= 1000000;
  else if (popStr.toUpperCase().includes('K')) num *= 1000;
  return num;
};

const sortedCharacters = computed(() => {
  return [...charactersData]
    .filter(c => c.imagePath)
    .sort((a, b) => parsePopularity(b.popularity) - parsePopularity(a.popularity));
});

const gameScreen = ref('welcome');
const username = ref('');
const score = ref(0);
const highScore = ref(0);
const currentQuestion = ref(null);
const gameState = ref('playing');
const selectedOptionId = ref(null);

onMounted(async () => {
  const savedUsername = localStorage.getItem('brainrot-username');
  if (savedUsername) {
    username.value = savedUsername;
    try {
      const res = await fetch(`${API_URL}/user/${savedUsername}`);
      if (res.ok) {
        const data = await res.json();
        highScore.value = data.highScore || 0;
      }
    } catch (e) {
      const saved = localStorage.getItem(`brainrot-${savedUsername.toLowerCase()}`);
      if (saved) highScore.value = parseInt(saved);
    }
  }

  try {
    await fetch(`${API_URL}/visit`, { method: 'POST' });
  } catch (e) {
    console.log('Server not available');
  }
});

const startGame = async () => {
  if (!username.value.trim()) return;
  
  try {
    const res = await fetch(`${API_URL}/user/${username.value}`);
    if (res.ok) {
      const data = await res.json();
      highScore.value = data.highScore || 0;
    }
  } catch (e) {
    const saved = localStorage.getItem(`brainrot-${username.value.toLowerCase()}`);
    if (saved) highScore.value = parseInt(saved);
  }

  localStorage.setItem('brainrot-username', username.value);
  score.value = 0;
  gameScreen.value = 'playing';
  nextRound();
};

const saveScore = async () => {
  if (score.value > highScore.value) {
    highScore.value = score.value;
  }
  
  try {
    await fetch(`${API_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: username.value, highScore: highScore.value })
    });
  } catch (e) {
    localStorage.setItem(`brainrot-${username.value.toLowerCase()}`, highScore.value.toString());
  }
};

const getCharacterByDifficulty = () => {
  const maxIndex = sortedCharacters.value.length - 1;
  const baseIndex = Math.min(score.value * 2, maxIndex - 10);
  const range = 10;
  const randomOffset = Math.floor(Math.random() * range);
  return sortedCharacters.value[Math.min(baseIndex + randomOffset, maxIndex)];
};

const nextRound = () => {
  gameState.value = 'playing';
  selectedOptionId.value = null;

  const target = getCharacterByDifficulty();
  const options = [target];
  
  while (options.length < 4) {
    const randomChar = sortedCharacters.value[Math.floor(Math.random() * sortedCharacters.value.length)];
    if (!options.find(o => o.name === randomChar.name)) {
      options.push(randomChar);
    }
  }

  currentQuestion.value = {
    target: target,
    options: options.sort(() => Math.random() - 0.5)
  };
};

const handleAnswer = (option) => {
  if (gameState.value !== 'playing') return;
  
  selectedOptionId.value = option.name;
  
  if (option.name === currentQuestion.value.target.name) {
    gameState.value = 'correct';
    score.value++;
    setTimeout(nextRound, 800);
  } else {
    gameState.value = 'wrong';
    saveScore();
    setTimeout(() => {
      gameScreen.value = 'gameover';
    }, 1500);
  }
};

const playAgain = () => {
  score.value = 0;
  gameScreen.value = 'playing';
  nextRound();
};

const goHome = () => {
  gameScreen.value = 'welcome';
};

const goStats = () => {
  router.push('/stats');
};

const shareText = computed(() => `I scored ${score.value} on Italian Brainrot Quiz! Can you beat me? 🧠🔥`);
const shareUrl = 'https://brainrot-test.xyz';

const shareTwitter = () => {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.value)}&url=${shareUrl}`, '_blank');
};

const shareWhatsapp = () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText.value + ' ' + shareUrl)}`, '_blank');
};

const copyLink = () => {
  navigator.clipboard.writeText(`${shareText.value} ${shareUrl}`);
  alert('Link copied to clipboard! 📋');
};
</script>

<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
    
    <header class="w-full px-4 py-4 flex justify-between items-center border-b border-white/5">
      <div class="flex items-center gap-2 cursor-pointer" @click="goHome">
        <span class="text-2xl">🧠</span>
        <span class="text-lg font-bold text-white">Brainrot Quiz</span>
      </div>
      <div class="flex items-center gap-4">
        <button @click="goStats" class="px-3 py-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
          🏆 Leaderboard
        </button>
        <div v-if="gameScreen !== 'welcome'" class="flex items-center gap-6">
          <div class="text-center">
            <p class="text-xs text-slate-500 uppercase tracking-wider">{{ username }}</p>
            <p class="text-xl font-bold text-white">{{ score }}</p>
          </div>
          <div class="text-center">
            <p class="text-xs text-amber-500 uppercase tracking-wider">Best</p>
            <p class="text-xl font-bold text-amber-400">{{ highScore }}</p>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      
      <!-- Welcome Screen -->
      <div v-if="gameScreen === 'welcome'" class="w-full max-w-md text-center">
        <div class="mb-8">
          <span class="text-7xl">🧠</span>
        </div>
        <h1 class="text-4xl font-black text-white mb-2">Brainrot Quiz</h1>
        <p class="text-slate-400 mb-8">Do you know your Italian Brainrot characters?</p>
        
        <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <label class="block text-left text-sm text-slate-400 mb-2">Enter your name</label>
          <input 
            v-model="username"
            type="text"
            placeholder="Your name..."
            class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            @keyup.enter="startGame"
          />
        </div>

        <button 
          @click="startGame"
          :disabled="!username.trim()"
          class="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-colors mb-3"
        >
          Start Quiz
        </button>

        <button 
          @click="goStats"
          class="w-full py-3 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 text-slate-300 font-medium rounded-2xl transition-colors"
        >
          🏆 View Leaderboard
        </button>
      </div>

      <!-- Quiz Screen -->
      <div v-else-if="gameScreen === 'playing' && currentQuestion" class="w-full max-w-md flex flex-col items-center">
        
        <h1 class="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
          Who is this?
        </h1>

        <div class="w-full aspect-square max-w-xs mb-8 relative">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-3xl blur-2xl"></div>
          <div class="relative w-full h-full bg-slate-800/80 border border-slate-700/50 rounded-3xl overflow-hidden backdrop-blur-sm">
            <img 
              :src="currentQuestion.target.imagePath" 
              alt="Character" 
              class="w-full h-full object-contain p-4"
              draggable="false"
            />
          </div>
        </div>

        <div class="w-full grid grid-cols-2 gap-3">
          <button 
            v-for="option in currentQuestion.options" 
            :key="option.name"
            @click="handleAnswer(option)"
            :disabled="gameState !== 'playing'"
            class="py-4 px-3 rounded-2xl font-medium text-sm md:text-base transition-all duration-200 border-2 text-center leading-tight"
            :class="[
              gameState === 'playing' 
                ? 'bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50 hover:border-violet-500/50 active:scale-95 cursor-pointer' 
                : '',
              gameState === 'correct' && option.name === currentQuestion.target.name 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                : '',
              gameState === 'wrong' && selectedOptionId === option.name 
                ? 'bg-red-500/20 border-red-500 text-red-300' 
                : '',
              gameState === 'wrong' && option.name === currentQuestion.target.name 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                : '',
              gameState !== 'playing' && option.name !== currentQuestion.target.name && option.name !== selectedOptionId 
                ? 'opacity-30' 
                : ''
            ]"
          >
            {{ option.name }}
          </button>
        </div>
      </div>

      <!-- Game Over -->
      <div v-else-if="gameScreen === 'gameover'" class="w-full max-w-md text-center">
        <div class="bg-slate-800/50 border border-slate-700/50 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
          <p class="text-4xl md:text-5xl mb-2 md:mb-4">😵</p>
          <h2 class="text-2xl md:text-3xl font-bold text-white mb-2">Game Over</h2>
          <p class="text-slate-400 mb-4 md:mb-6">The correct answer was:</p>
          <p class="text-lg md:text-xl font-semibold text-emerald-400 mb-6 md:mb-8">{{ currentQuestion?.target?.name }}</p>
          
          <div class="bg-slate-900/50 rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
            <p class="text-xs md:text-sm text-slate-500 uppercase tracking-wider mb-1">Final Score</p>
            <p class="text-5xl md:text-6xl font-black text-white">{{ score }}</p>
          </div>

          <!-- Share Section -->
          <div class="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8">
            <button @click="shareTwitter" class="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-3 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/50 rounded-xl transition-colors group">
              <span class="text-xl md:text-2xl group-hover:scale-110 transition-transform">🐦</span>
              <span class="text-[10px] md:text-xs font-bold text-[#1DA1F2]">Twitter</span>
            </button>
            <button @click="shareWhatsapp" class="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-3 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 rounded-xl transition-colors group">
              <span class="text-xl md:text-2xl group-hover:scale-110 transition-transform">💬</span>
              <span class="text-[10px] md:text-xs font-bold text-[#25D366]">WhatsApp</span>
            </button>
            <button @click="copyLink" class="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 rounded-xl transition-colors group">
              <span class="text-xl md:text-2xl group-hover:scale-110 transition-transform">📋</span>
              <span class="text-[10px] md:text-xs font-bold text-slate-300">Copy</span>
            </button>
          </div>

          <div class="flex gap-3">
            <button 
              @click="goHome" 
              class="flex-1 py-3 md:py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-2xl transition-colors text-sm md:text-base"
            >
              Home
            </button>
            <button 
              @click="playAgain" 
              class="flex-1 py-3 md:py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-2xl transition-colors text-sm md:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>

    </main>

    <footer class="w-full px-4 py-3 text-center border-t border-white/5">
      <p class="text-xs text-slate-600">Italian Brainrot Quiz © 2026</p>
    </footer>

  </div>
</template>
